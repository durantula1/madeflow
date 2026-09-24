-- Closing a company: a sole member who deletes their account also closes the company.
-- The purge runs after the same grace period as account deletion.

ALTER TABLE app.organizations
  ADD COLUMN closure_requested_at timestamp with time zone;

-- History tables stay immutable. The only exception is deleting a whole company inside
-- app.purge_organization(), which sets app.purge_organization for its own transaction.
CREATE OR REPLACE FUNCTION app.is_purging_row(old_row jsonb) RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(current_setting('app.purge_organization', true), '') <> ''
    AND (old_row->>'organization_id' IS NULL OR old_row->>'organization_id' = current_setting('app.purge_organization', true));
$$;

CREATE OR REPLACE FUNCTION app.prevent_append_only_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Append-only records cannot be updated or deleted';
END $$;

CREATE OR REPLACE FUNCTION app.prevent_immutable_record_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Immutable history records cannot be updated or deleted';
END;
$$;

-- Deletes every row that belongs to one company, children before parents.
CREATE OR REPLACE FUNCTION app.purge_organization(p_org uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.organizations WHERE id = p_org AND closure_requested_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Organization % is not scheduled for closure', p_org;
  END IF;
  PERFORM set_config('app.purge_organization', p_org::text, true);

  -- Change orders and revisions point at each other.
  UPDATE app.change_orders SET current_revision_id = NULL, baseline_offer_id = NULL WHERE organization_id = p_org;

  DELETE FROM app.payment_disputes WHERE organization_id = p_org;
  DELETE FROM app.project_receipts WHERE organization_id = p_org;
  DELETE FROM app.payment_installments WHERE organization_id = p_org;
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
