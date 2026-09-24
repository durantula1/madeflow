-- Staff-only notes about a client/project, optionally about one document.
CREATE TABLE app.internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  change_order_id uuid REFERENCES app.change_orders(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX internal_notes_project_idx ON app.internal_notes (project_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX internal_notes_change_order_idx ON app.internal_notes (change_order_id, created_at DESC) WHERE deleted_at IS NULL;

-- Questions and answers between the client and the company about one document; visible to both.
CREATE TABLE app.document_messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  change_order_id uuid NOT NULL REFERENCES app.change_orders(id) ON DELETE CASCADE,
  revision_id bigint REFERENCES app.change_order_revisions(id) ON DELETE SET NULL,
  author_type text NOT NULL CHECK (author_type IN ('staff', 'portal_contact')),
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_by_staff_at timestamptz,
  read_by_client_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX document_messages_change_order_idx ON app.document_messages (change_order_id, created_at);

-- Per-user choice of which events also arrive by email (in-app notifications always arrive).
CREATE TABLE app.notification_preferences (
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  email boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id, event_type)
);

ALTER TABLE app.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.document_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.internal_notes FROM anon, authenticated;
REVOKE ALL ON TABLE app.document_messages FROM anon, authenticated;
REVOKE ALL ON TABLE app.notification_preferences FROM anon, authenticated;
