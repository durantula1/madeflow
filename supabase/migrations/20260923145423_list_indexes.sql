-- Indexes backing paginated lists, dashboard counters and notification feeds.
-- Each one matches a WHERE + ORDER BY used by an app query so LIMIT/OFFSET reads stay index scans.

-- /app/projects without a status filter: org + newest first, archived rows excluded.
CREATE INDEX IF NOT EXISTS projects_org_updated_active_idx
  ON app.projects (organization_id, updated_at DESC)
  WHERE archived_at IS NULL;

-- /app/offers, dashboard "latest documents": org + kind + newest first.
CREATE INDEX IF NOT EXISTS change_orders_org_kind_updated_idx
  ON app.change_orders (organization_id, document_kind, updated_at DESC)
  WHERE archived_at IS NULL;

-- Offers / changes lists inside one project.
CREATE INDEX IF NOT EXISTS change_orders_project_kind_updated_idx
  ON app.change_orders (project_id, document_kind, updated_at DESC)
  WHERE archived_at IS NULL;

-- Document timeline, read in chronological order with a (created_at, id) cursor.
CREATE INDEX IF NOT EXISTS timeline_change_created_idx
  ON app.timeline_events (change_order_id, created_at, id);
DROP INDEX IF EXISTS app.timeline_change_idx;

-- Staff notifications page, always filtered by org + user.
CREATE INDEX IF NOT EXISTS staff_notifications_org_user_created_idx
  ON app.staff_notifications (organization_id, user_id, created_at DESC);
DROP INDEX IF EXISTS app.staff_notifications_user_idx;

-- Dashboard "overdue milestones" counter.
CREATE INDEX IF NOT EXISTS project_milestones_org_open_due_idx
  ON app.project_milestones (organization_id, due_on)
  WHERE status <> 'completed';
