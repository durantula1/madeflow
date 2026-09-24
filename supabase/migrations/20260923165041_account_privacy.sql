-- Account self-service: scheduled deletion with a grace period and a record of accepted legal documents.

ALTER TABLE app.profiles
  ADD COLUMN deletion_requested_at timestamp with time zone,
  ADD COLUMN deleted_at timestamp with time zone;

-- The purge job reads only profiles whose grace period is running.
CREATE INDEX profiles_deletion_due_idx
  ON app.profiles (deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE app.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  document text NOT NULL CHECK (document IN ('terms', 'privacy')),
  version text NOT NULL,
  accepted_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX user_consents_user_document_version_uidx
  ON app.user_consents (user_id, document, version);

-- Business tables are available only to trusted server code.
ALTER TABLE app.user_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.user_consents FROM anon, authenticated;
