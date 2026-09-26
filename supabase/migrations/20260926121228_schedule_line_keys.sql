-- A schedule line keeps its identity across offer versions (line_key), so a stage created from
-- version 1 still counts as planned after version 2 is approved. New versions copy the key of
-- the line they came from; brand-new lines get a fresh one.
ALTER TABLE app.change_order_schedule_items
  ADD COLUMN line_key uuid NOT NULL DEFAULT gen_random_uuid();

-- Existing later versions: a line with the same title as a line of an earlier version of the
-- same document is the same line. The frozen-content trigger is paused only for this backfill.
ALTER TABLE app.change_order_schedule_items DISABLE TRIGGER protect_frozen_schedule_item;
UPDATE app.change_order_schedule_items s
SET line_key = matched.line_key
FROM (
  SELECT s2.id, (
    SELECT s1.line_key
    FROM app.change_order_schedule_items s1
    JOIN app.change_order_revisions r1 ON r1.id = s1.revision_id
    WHERE r1.change_order_id = r2.change_order_id AND lower(s1.title) = lower(s2.title)
    ORDER BY r1.revision_number, s1.position
    LIMIT 1
  ) AS line_key
  FROM app.change_order_schedule_items s2
  JOIN app.change_order_revisions r2 ON r2.id = s2.revision_id
) matched
WHERE matched.id = s.id AND matched.line_key IS DISTINCT FROM s.line_key;
ALTER TABLE app.change_order_schedule_items ENABLE TRIGGER protect_frozen_schedule_item;

CREATE UNIQUE INDEX change_order_schedule_items_line_key_uidx
  ON app.change_order_schedule_items (revision_id, line_key);

-- Which schedule line a stage came from, independent of the version.
ALTER TABLE app.project_milestones ADD COLUMN schedule_line_key uuid;
UPDATE app.project_milestones m
SET schedule_line_key = s.line_key
FROM app.change_order_schedule_items s
WHERE s.id = m.schedule_item_id;
CREATE INDEX project_milestones_schedule_line_idx
  ON app.project_milestones (project_id, schedule_line_key) WHERE schedule_line_key IS NOT NULL;
