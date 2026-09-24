CREATE TYPE app.member_permission AS ENUM (
  'projects.create',
  'milestones.manage',
  'offers.edit',
  'changes.draft',
  'documents.send',
  'drafts.view_all',
  'notes.view',
  'payments.record',
  'finance.view'
);

ALTER TABLE app.organization_members
  ADD COLUMN permissions app.member_permission[] NOT NULL DEFAULT '{}',
  ADD COLUMN all_projects boolean NOT NULL DEFAULT false;

UPDATE app.organization_members
SET permissions = CASE
  WHEN role = 'field' THEN ARRAY['changes.draft', 'milestones.manage']::app.member_permission[]
  WHEN role IN ('office', 'admin', 'member') THEN
    ARRAY['projects.create', 'milestones.manage', 'offers.edit', 'changes.draft', 'documents.send', 'drafts.view_all', 'notes.view', 'finance.view']::app.member_permission[]
    || CASE WHEN can_record_payments THEN ARRAY['payments.record']::app.member_permission[] ELSE '{}' END
  ELSE '{}'
END
WHERE status = 'active' AND role <> 'owner';

ALTER TABLE app.organization_members
  DROP COLUMN can_record_payments,
  DROP COLUMN can_draft_documents,
  DROP COLUMN can_send_documents;

ALTER TABLE app.team_invites
  ADD COLUMN permissions app.member_permission[] NOT NULL DEFAULT '{}',
  ADD COLUMN all_projects boolean NOT NULL DEFAULT false;

UPDATE app.team_invites
SET permissions = CASE
  WHEN role = 'field' THEN ARRAY['changes.draft', 'milestones.manage']::app.member_permission[]
  WHEN role = 'owner' THEN '{}'
  ELSE ARRAY['projects.create', 'milestones.manage', 'offers.edit', 'changes.draft', 'documents.send', 'drafts.view_all', 'notes.view', 'finance.view']::app.member_permission[]
    || CASE WHEN can_record_payments THEN ARRAY['payments.record']::app.member_permission[] ELSE '{}' END
END;

ALTER TABLE app.team_invites DROP COLUMN can_record_payments;
