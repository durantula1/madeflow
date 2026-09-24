ALTER TABLE app.project_contacts
  ADD COLUMN email_verified_at timestamp with time zone,
  ADD COLUMN locked_at timestamp with time zone;

CREATE TABLE app.portal_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_session_id bigint NOT NULL REFERENCES app.portal_sessions(id) ON DELETE CASCADE,
  project_contact_id uuid NOT NULL REFERENCES app.project_contacts(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('claim', 'email_change', 'decision')),
  revision_id bigint REFERENCES app.change_order_revisions(id) ON DELETE CASCADE,
  decision app.change_decision,
  email text NOT NULL,
  target_email text,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  created_ip inet,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (purpose <> 'decision' OR (revision_id IS NOT NULL AND decision IS NOT NULL))
);
CREATE INDEX portal_otps_contact_created_idx ON app.portal_otps (project_contact_id, created_at);
CREATE INDEX portal_otps_session_idx ON app.portal_otps (portal_session_id);
CREATE INDEX portal_otps_revision_idx ON app.portal_otps (revision_id);
ALTER TABLE app.portal_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.portal_otps FROM anon, authenticated;

ALTER TABLE app.portal_decisions
  ADD COLUMN otp_id uuid REFERENCES app.portal_otps(id) ON DELETE RESTRICT,
  ADD COLUMN verified_email text;
ALTER TABLE app.portal_decisions
  ADD CONSTRAINT portal_decisions_verified_chk CHECK (otp_id IS NOT NULL AND verified_email IS NOT NULL) NOT VALID;
CREATE UNIQUE INDEX portal_decisions_otp_uidx ON app.portal_decisions (otp_id);

CREATE OR REPLACE FUNCTION app.protect_locked_contact() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL
    AND coalesce(current_setting('app.contact_change', true), '') <> 'client'
    AND (
      ROW(NEW.name, NEW.email, NEW.phone, NEW.portal_role, NEW.project_id) IS DISTINCT FROM ROW(OLD.name, OLD.email, OLD.phone, OLD.portal_role, OLD.project_id)
      OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at
      OR NEW.locked_at IS NULL
    ) THEN
    RAISE EXCEPTION 'Client-verified contact is locked';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_locked_contact BEFORE UPDATE ON app.project_contacts FOR EACH ROW EXECUTE FUNCTION app.protect_locked_contact();

CREATE OR REPLACE FUNCTION app.require_portal_decision() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status IN ('approved', 'declined', 'changes_requested') AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM app.portal_decisions d
      WHERE d.revision_id = NEW.id
        AND d.decision::text = NEW.status::text
        AND d.revision_content_hash = NEW.content_hash
        AND d.otp_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Revision decision requires a verified client decision';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER require_portal_decision BEFORE UPDATE OF status ON app.change_order_revisions FOR EACH ROW EXECUTE FUNCTION app.require_portal_decision();
