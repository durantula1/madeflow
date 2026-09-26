-- "I paid": the client reports a payment; the company confirms it (which records a receipt) or rejects it.
CREATE TABLE app.payment_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  project_id uuid NOT NULL REFERENCES app.projects(id),
  offer_id uuid,
  installment_id uuid REFERENCES app.payment_installments(id),
  project_contact_id uuid NOT NULL REFERENCES app.project_contacts(id),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL,
  method text NOT NULL CHECK (method IN ('cash', 'bank', 'card', 'other')),
  paid_on date NOT NULL,
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  response text CHECK (response IS NULL OR char_length(response) <= 1000),
  receipt_id uuid REFERENCES app.project_receipts(id),
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id, offer_id) REFERENCES app.change_orders (project_id, id)
);
CREATE INDEX payment_claims_project_status_idx ON app.payment_claims (project_id, status);

-- A receipt can be disputed again after an earlier dispute was resolved; only one can be open.
CREATE UNIQUE INDEX payment_disputes_one_open_uidx ON app.payment_disputes (receipt_id) WHERE status = 'open';

-- Handover: the company asks the client to accept the work of one offer; the client accepts it or
-- lists issues. Append-only; the latest row is the current state.
CREATE TABLE app.offer_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  project_id uuid NOT NULL REFERENCES app.projects(id),
  offer_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('requested', 'accepted', 'issues')),
  note text CHECK (note IS NULL OR char_length(note) <= 2000),
  typed_name text,
  actor_type text NOT NULL CHECK (actor_type IN ('staff', 'portal_contact')),
  actor_id uuid NOT NULL,
  ip inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id, offer_id) REFERENCES app.change_orders (project_id, id),
  CHECK (kind <> 'accepted' OR typed_name IS NOT NULL),
  CHECK (kind <> 'issues' OR note IS NOT NULL)
);
CREATE INDEX offer_acceptances_offer_idx ON app.offer_acceptances (offer_id, created_at);
CREATE TRIGGER offer_acceptances_append_only BEFORE UPDATE OR DELETE ON app.offer_acceptances
  FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();

-- Questions about the project as a whole, not about one document.
ALTER TABLE app.document_messages ALTER COLUMN change_order_id DROP NOT NULL;
CREATE INDEX document_messages_project_idx ON app.document_messages (project_id, created_at) WHERE change_order_id IS NULL;

-- A moved stage shows the client where it was before and why.
ALTER TABLE app.project_milestones
  ADD COLUMN previous_due_on date,
  ADD COLUMN due_change_reason text CHECK (due_change_reason IS NULL OR char_length(due_change_reason) <= 300);

ALTER TABLE app.payment_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.offer_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.payment_claims FROM anon, authenticated;
REVOKE ALL ON TABLE app.offer_acceptances FROM anon, authenticated;

-- Same as 20260926110412_change_orders_approved_revision, plus the new tables and pointers.
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
