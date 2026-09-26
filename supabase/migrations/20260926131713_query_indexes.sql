-- Lookups the new flows make by foreign key: "is anything paid or claimed against this installment",
-- "which stages cover this change", handover rows per project, and the daily client digest.
CREATE INDEX IF NOT EXISTS payment_installments_milestone_idx ON app.payment_installments (milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_receipts_installment_idx ON app.project_receipts (installment_id) WHERE installment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_milestones_change_order_idx ON app.project_milestones (change_order_id) WHERE change_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_claims_installment_idx ON app.payment_claims (installment_id) WHERE installment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS offer_acceptances_project_idx ON app.offer_acceptances (project_id, created_at);
CREATE INDEX IF NOT EXISTS timeline_client_digest_idx ON app.timeline_events (created_at) WHERE visibility = 'client' AND actor_type = 'staff';
