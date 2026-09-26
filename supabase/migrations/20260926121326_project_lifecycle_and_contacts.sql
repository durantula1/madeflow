-- Project lifecycle: active -> completed -> archived (completed can be reopened).
ALTER TABLE app.projects
  ADD COLUMN completed_at timestamp with time zone,
  -- Last time the client got the daily progress email for this project.
  ADD COLUMN client_digest_at timestamp with time zone;

-- Client contacts can be removed (their links stop working) and there is exactly one primary approver.
ALTER TABLE app.project_contacts ADD COLUMN removed_at timestamp with time zone;
CREATE UNIQUE INDEX project_contacts_one_approver_uidx
  ON app.project_contacts (project_id)
  WHERE is_primary AND portal_role = 'approver' AND removed_at IS NULL;

-- A client-verified contact keeps the email the client proved. The company may still fix the name
-- and phone, change the role (to hand approval to someone else) or remove the contact. Only the
-- client ('client') or an owner's explicit reset ('reset') may change the verified email.
CREATE OR REPLACE FUNCTION app.protect_locked_contact() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL
    AND coalesce(current_setting('app.contact_change', true), '') NOT IN ('client', 'reset')
    AND (
      NEW.email IS DISTINCT FROM OLD.email
      OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at
      OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
      OR NEW.project_id IS DISTINCT FROM OLD.project_id
    ) THEN
    RAISE EXCEPTION 'Client-verified contact is locked';
  END IF;
  RETURN NEW;
END $$;
