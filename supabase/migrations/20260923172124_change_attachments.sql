-- Photos and PDFs attached to offer / change revisions. Files live in the private
-- change-attachments bucket under <organization_id>/<change_order_id>/; only server code reads them.

ALTER TABLE app.change_attachments
  ADD COLUMN change_order_id uuid NOT NULL REFERENCES app.change_orders(id) ON DELETE RESTRICT,
  ADD COLUMN original_name text NOT NULL;

-- A new revision reuses the files of the previous one, so a path may appear once per revision.
DROP INDEX IF EXISTS app.change_attachments_storage_path_uidx;
CREATE UNIQUE INDEX change_attachments_revision_path_uidx ON app.change_attachments (revision_id, storage_path);
CREATE INDEX change_attachments_change_order_idx ON app.change_attachments (change_order_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('change-attachments', 'change-attachments', false, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;
