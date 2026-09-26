-- An indicative work schedule inside an offer version: stages with a duration, no dates.
-- It is shown to the client with the offer and frozen with it, but it is not a commitment:
-- after approval the company turns it into dated stages on the project (project_milestones).
CREATE TABLE app.change_order_schedule_items (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  revision_id bigint NOT NULL REFERENCES app.change_order_revisions(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 180),
  duration_days integer NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
  UNIQUE (revision_id, position)
);

-- A sent version keeps the schedule the client saw.
CREATE OR REPLACE FUNCTION app.protect_frozen_schedule_item() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  IF EXISTS (
    SELECT 1 FROM app.change_order_revisions r
    WHERE r.frozen_at IS NOT NULL
      AND r.id IN (CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.revision_id END, CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.revision_id END)
  ) THEN
    RAISE EXCEPTION 'The schedule of a sent version cannot change';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE TRIGGER protect_frozen_schedule_item
  BEFORE INSERT OR UPDATE OR DELETE ON app.change_order_schedule_items
  FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_schedule_item();

-- Which schedule line a dated stage was created from, so the project knows what is already planned.
ALTER TABLE app.project_milestones
  ADD COLUMN schedule_item_id bigint REFERENCES app.change_order_schedule_items(id) ON DELETE SET NULL;
CREATE INDEX project_milestones_schedule_item_idx ON app.project_milestones (schedule_item_id) WHERE schedule_item_id IS NOT NULL;

ALTER TABLE app.change_order_schedule_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.change_order_schedule_items FROM anon, authenticated;
