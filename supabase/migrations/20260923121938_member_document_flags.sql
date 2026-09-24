ALTER TABLE app.organization_members
  ADD COLUMN can_draft_documents boolean NOT NULL DEFAULT false,
  ADD COLUMN can_send_documents boolean NOT NULL DEFAULT false;

UPDATE app.organization_members
SET can_draft_documents = true,
    can_send_documents = true
WHERE role IN ('office', 'admin', 'owner');

UPDATE app.organization_members
SET can_draft_documents = true,
    can_send_documents = false
WHERE role = 'field';

CREATE OR REPLACE FUNCTION app.broadcast_staff_refresh() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('id', NEW.id, 'event_type', NEW.event_type, 'title', NEW.title),
    'refresh',
    'staff:' || NEW.user_id::text,
    true
  );
  RETURN NEW;
END;
$$;
