-- Drawn client signatures, "viewed" tracking, offer validity and client reminders.

-- Written once together with the decision row (the append-only trigger stays in force).
ALTER TABLE app.portal_decisions
  ADD COLUMN signature_storage_path text,
  ADD COLUMN signature_sha256 text;

-- Process bookkeeping, not document content: the frozen-revision trigger does not cover these.
ALTER TABLE app.change_order_revisions
  ADD COLUMN viewed_at timestamptz,
  ADD COLUMN client_reminded_at timestamptz,
  ADD COLUMN expiry_warned_at timestamptz;

ALTER TABLE app.organizations
  ADD COLUMN offer_validity_days integer NOT NULL DEFAULT 14 CHECK (offer_validity_days BETWEEN 1 AND 180);

CREATE INDEX change_order_revisions_open_due_idx ON app.change_order_revisions (response_due_at)
  WHERE status IN ('sent', 'viewed');

-- Signature images live in their own private bucket under <organization_id>/<revision_id>/; only server code reads them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('decision-signatures', 'decision-signatures', false, 262144, ARRAY['image/png'])
ON CONFLICT (id) DO NOTHING;
