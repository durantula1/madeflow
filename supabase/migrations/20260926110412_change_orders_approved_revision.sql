-- The version in force. `current_revision_id` is the version being worked on (a draft or one
-- awaiting the client); `approved_revision_id` is the last version the client approved. They
-- differ while an approved offer is being renegotiated: the old terms stay in force until the
-- client approves the new version, and approval moves this pointer in the same transaction.
ALTER TABLE app.change_orders ADD COLUMN approved_revision_id bigint;

-- The approved version must belong to the same document.
CREATE UNIQUE INDEX change_revisions_order_id_uidx ON app.change_order_revisions (change_order_id, id);
ALTER TABLE app.change_orders
  ADD CONSTRAINT change_orders_approved_revision_fk
  FOREIGN KEY (id, approved_revision_id) REFERENCES app.change_order_revisions (change_order_id, id) ON DELETE RESTRICT;

UPDATE app.change_orders c
SET approved_revision_id = r.id
FROM (
  SELECT DISTINCT ON (change_order_id) change_order_id, id
  FROM app.change_order_revisions
  WHERE status = 'approved'
  ORDER BY change_order_id, revision_number DESC
) r
WHERE r.change_order_id = c.id;

-- One base offer per project; the app already checks this under an advisory lock.
CREATE UNIQUE INDEX change_orders_one_offer_per_project_uidx
  ON app.change_orders (project_id)
  WHERE document_kind = 'offer' AND archived_at IS NULL;

-- Same as 20260923171139_organization_closure, plus clearing the new pointer.
CREATE OR REPLACE FUNCTION app.purge_organization(p_org uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.organizations WHERE id = p_org AND closure_requested_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Organization % is not scheduled for closure', p_org;
  END IF;
  PERFORM set_config('app.purge_organization', p_org::text, true);

  -- Change orders and revisions point at each other.
  UPDATE app.change_orders SET current_revision_id = NULL, approved_revision_id = NULL, baseline_offer_id = NULL WHERE organization_id = p_org;

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
