-- Sidebar unread badge: counts only a user's unread rows, so it stays an index scan however long the feed grows.
CREATE INDEX IF NOT EXISTS staff_notifications_org_user_unread_idx
  ON app.staff_notifications (organization_id, user_id)
  WHERE read_at IS NULL;
