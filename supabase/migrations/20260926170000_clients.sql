-- One client can have several projects. The client is a natural person in one organization;
-- a project contact stays the per-project invitation and role (approver or viewer) of a client.
-- Phase 1a of docs/clients-plan.md: the data only. The portal still works per project contact.

CREATE TABLE app.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  email text,
  email_normalized text GENERATED ALWAYS AS (nullif(lower(btrim(email)), '')) STORED,
  phone text,
  -- Digits with a leading +, set by the app (0888… becomes +359888…); used to suggest duplicates.
  phone_normalized text,
  address text,
  notes text,
  merged_into_id uuid REFERENCES app.clients (id),
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clients_org_id_unique UNIQUE (organization_id, id)
);
CREATE INDEX clients_org_name_idx ON app.clients (organization_id, name);
CREATE INDEX clients_org_email_idx ON app.clients (organization_id, email_normalized) WHERE email_normalized IS NOT NULL;
CREATE INDEX clients_org_phone_idx ON app.clients (organization_id, phone_normalized) WHERE phone_normalized IS NOT NULL;

ALTER TABLE app.clients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.clients FROM anon, authenticated;

ALTER TABLE app.projects
  ADD CONSTRAINT projects_org_id_unique UNIQUE (organization_id, id),
  ADD COLUMN client_id uuid;
ALTER TABLE app.projects
  ADD CONSTRAINT projects_client_tenant_fk FOREIGN KEY (organization_id, client_id)
    REFERENCES app.clients (organization_id, id) ON DELETE RESTRICT;
CREATE INDEX projects_org_client_idx ON app.projects (organization_id, client_id);

ALTER TABLE app.project_contacts
  ADD COLUMN organization_id uuid,
  ADD COLUMN client_id uuid;

UPDATE app.project_contacts pc SET organization_id = p.organization_id
FROM app.projects p WHERE p.id = pc.project_id;

-- Backfill. Contacts that confirmed the same email in one organization are the same person;
-- everyone else becomes a client of their own. Anything looser is left to a manual merge.
CREATE TEMP TABLE client_backfill ON COMMIT DROP AS
SELECT pc.id AS contact_id,
       CASE WHEN pc.email_verified_at IS NOT NULL AND nullif(lower(btrim(pc.email)), '') IS NOT NULL
         THEN first_value(pc.id) OVER (
           PARTITION BY pc.organization_id, lower(btrim(pc.email)), (pc.email_verified_at IS NOT NULL)
           ORDER BY pc.removed_at IS NULL DESC, pc.email_verified_at DESC, pc.created_at DESC)
         ELSE pc.id END AS leader_id
FROM app.project_contacts pc;

CREATE TEMP TABLE client_leaders ON COMMIT DROP AS
SELECT leader_id, gen_random_uuid() AS client_id FROM (SELECT DISTINCT leader_id FROM client_backfill) l;

INSERT INTO app.clients (id, organization_id, name, email, phone, phone_normalized, archived_at, created_at, updated_at)
SELECT cl.client_id, pc.organization_id, pc.name, pc.email, pc.phone,
       nullif(regexp_replace(regexp_replace(coalesce(pc.phone, ''), '[^0-9+]', '', 'g'), '^0', '+359'), ''),
       -- A client whose every invitation was removed starts in the archive.
       CASE WHEN bool_and(member.removed_at IS NOT NULL) THEN max(member.removed_at) END,
       min(member.created_at), now()
FROM client_leaders cl
JOIN app.project_contacts pc ON pc.id = cl.leader_id
JOIN client_backfill b ON b.leader_id = cl.leader_id
JOIN app.project_contacts member ON member.id = b.contact_id
GROUP BY cl.client_id, pc.organization_id, pc.name, pc.email, pc.phone;

UPDATE app.project_contacts pc SET client_id = cl.client_id
FROM client_backfill b JOIN client_leaders cl ON cl.leader_id = b.leader_id
WHERE b.contact_id = pc.id;

-- The contracting client of a project is its primary approver (the current one, else the latest).
UPDATE app.projects p SET client_id = pick.client_id
FROM (
  SELECT DISTINCT ON (project_id) project_id, client_id
  FROM app.project_contacts
  WHERE is_primary
  ORDER BY project_id, removed_at IS NULL DESC, created_at DESC
) pick
WHERE pick.project_id = p.id;

ALTER TABLE app.project_contacts
  ADD CONSTRAINT project_contacts_project_tenant_fk FOREIGN KEY (organization_id, project_id)
    REFERENCES app.projects (organization_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT project_contacts_client_tenant_fk FOREIGN KEY (organization_id, client_id)
    REFERENCES app.clients (organization_id, id) ON DELETE RESTRICT;
CREATE INDEX project_contacts_client_idx ON app.project_contacts (client_id);
-- One active invitation per client and project is enforced by the app for now: existing data may
-- hold two contacts with the same confirmed email in one project, and those must be merged by hand.

-- The contracting client never changes once set (docs/clients-plan.md, 14.1).
CREATE OR REPLACE FUNCTION app.protect_project_client() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM OLD.client_id
    AND coalesce(current_setting('app.client_merge', true), '') <> 'on' THEN
    RAISE EXCEPTION 'The client of a project cannot change';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER projects_protect_client BEFORE UPDATE OF client_id ON app.projects
  FOR EACH ROW EXECUTE FUNCTION app.protect_project_client();

-- Same as 20260926121441_client_payments_acceptance_questions, plus clients after projects.
CREATE OR REPLACE FUNCTION app.purge_organization(p_org uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.organizations WHERE id = p_org AND closure_requested_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Organization % is not scheduled for closure', p_org;
  END IF;
  PERFORM set_config('app.purge_organization', p_org::text, true);

  -- Change orders and revisions point at each other.
  UPDATE app.change_orders SET current_revision_id = NULL, approved_revision_id = NULL, baseline_offer_id = NULL, absorbed_by_revision_id = NULL WHERE organization_id = p_org;

  DELETE FROM app.payment_claims WHERE organization_id = p_org;
  DELETE FROM app.payment_disputes WHERE organization_id = p_org;
  DELETE FROM app.project_receipts WHERE organization_id = p_org;
  DELETE FROM app.payment_installments WHERE organization_id = p_org;
  DELETE FROM app.offer_acceptances WHERE organization_id = p_org;
  DELETE FROM app.timeline_events WHERE organization_id = p_org;
  DELETE FROM app.portal_decisions WHERE revision_id IN (
    SELECT r.id FROM app.change_order_revisions r JOIN app.change_orders c ON c.id = r.change_order_id WHERE c.organization_id = p_org
  );
  DELETE FROM app.change_attachments WHERE organization_id = p_org;
  DELETE FROM app.portal_otps WHERE project_contact_id IN (
    SELECT pc.id FROM app.project_contacts pc JOIN app.projects p ON p.id = pc.project_id WHERE p.organization_id = p_org
  );
  DELETE FROM app.project_milestones WHERE organization_id = p_org;
  DELETE FROM app.change_order_revisions WHERE change_order_id IN (SELECT id FROM app.change_orders WHERE organization_id = p_org);
  DELETE FROM app.change_orders WHERE organization_id = p_org;
  DELETE FROM app.portal_grants WHERE project_id IN (SELECT id FROM app.projects WHERE organization_id = p_org);
  DELETE FROM app.staff_notifications WHERE organization_id = p_org;
  DELETE FROM app.projects WHERE organization_id = p_org;
  DELETE FROM app.clients WHERE organization_id = p_org;

  -- Legacy order model.
  DELETE FROM app.approvals WHERE organization_id = p_org;
  DELETE FROM app.review_requests WHERE organization_id = p_org;
  DELETE FROM app.service_requests WHERE organization_id = p_org;
  DELETE FROM app.warranty_items WHERE organization_id = p_org;
  DELETE FROM app.installations WHERE organization_id = p_org;
  DELETE FROM app.payments WHERE organization_id = p_org;
  DELETE FROM app.version_files WHERE organization_id = p_org;
  DELETE FROM app.portal_links WHERE organization_id = p_org;
  UPDATE app.orders SET current_approved_version_id = NULL WHERE organization_id = p_org;
  DELETE FROM app.specification_versions WHERE organization_id = p_org;
  DELETE FROM app.orders WHERE organization_id = p_org;
  DELETE FROM app.customers WHERE organization_id = p_org;

  DELETE FROM app.activity_events WHERE organization_id = p_org;
  DELETE FROM app.notification_outbox WHERE organization_id = p_org;
  DELETE FROM app.team_invites WHERE organization_id = p_org;
  DELETE FROM app.owner_role_requests WHERE organization_id = p_org;
  -- organization_members, specification_templates and template overrides cascade.
  DELETE FROM app.organizations WHERE id = p_org;
END $$;
REVOKE ALL ON FUNCTION app.purge_organization(uuid) FROM PUBLIC, anon, authenticated;
