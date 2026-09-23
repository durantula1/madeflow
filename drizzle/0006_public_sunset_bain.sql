CREATE TYPE "app"."attachment_kind" AS ENUM('image', 'audio', 'document');--> statement-breakpoint
CREATE TYPE "app"."attachment_visibility" AS ENUM('internal', 'client');--> statement-breakpoint
CREATE TYPE "app"."change_decision" AS ENUM('approved', 'declined', 'changes_requested');--> statement-breakpoint
CREATE TYPE "app"."change_kind" AS ENUM('addition', 'credit', 'no_cost', 'schedule_only');--> statement-breakpoint
CREATE TYPE "app"."change_lifecycle_status" AS ENUM('draft', 'open', 'resolved', 'canceled');--> statement-breakpoint
CREATE TYPE "app"."change_revision_status" AS ENUM('draft', 'sent', 'viewed', 'approved', 'declined', 'changes_requested', 'canceled', 'expired', 'superseded');--> statement-breakpoint
CREATE TYPE "app"."change_work_status" AS ENUM('not_started', 'scheduled', 'in_progress', 'completed', 'invoiced', 'paid');--> statement-breakpoint
CREATE TYPE "app"."portal_contact_role" AS ENUM('viewer', 'approver');--> statement-breakpoint
CREATE TYPE "app"."project_permission" AS ENUM('view', 'draft', 'send', 'manage');--> statement-breakpoint
CREATE TYPE "app"."project_status" AS ENUM('active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "app"."schedule_impact_type" AS ENUM('none', 'days', 'unknown');--> statement-breakpoint
CREATE TYPE "app"."timeline_actor_type" AS ENUM('staff', 'portal_contact', 'system', 'ai');--> statement-breakpoint
CREATE TYPE "app"."timeline_visibility" AS ENUM('internal', 'client');--> statement-breakpoint
ALTER TYPE "app"."member_role" ADD VALUE 'field';--> statement-breakpoint
ALTER TYPE "app"."member_role" ADD VALUE 'office';--> statement-breakpoint
CREATE TABLE "app"."change_attachments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."change_attachments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" bigint,
	"storage_path" text NOT NULL,
	"kind" "app"."attachment_kind" NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"sha256" text NOT NULL,
	"visibility" "app"."attachment_visibility" DEFAULT 'client' NOT NULL,
	"processing_status" text DEFAULT 'ready' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."change_order_line_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."change_order_line_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"revision_id" bigint NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" text,
	"unit_price" numeric(14, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."change_order_revisions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."change_order_revisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"change_order_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"status" "app"."change_revision_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"reason" text,
	"change_kind" "app"."change_kind" DEFAULT 'addition' NOT NULL,
	"pricing_type" text DEFAULT 'fixed' NOT NULL,
	"currency" char(3) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"schedule_impact_type" "app"."schedule_impact_type" DEFAULT 'none' NOT NULL,
	"schedule_impact_days" integer,
	"response_due_at" timestamp with time zone,
	"client_note" text,
	"internal_note" text,
	"frozen_at" timestamp with time zone,
	"content_hash" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."change_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"sequence_number" bigint NOT NULL,
	"current_revision_id" bigint,
	"lifecycle_status" "app"."change_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"work_status" "app"."change_work_status" DEFAULT 'not_started' NOT NULL,
	"created_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."portal_decisions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."portal_decisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"revision_id" bigint NOT NULL,
	"project_contact_id" uuid NOT NULL,
	"portal_session_id" bigint NOT NULL,
	"decision" "app"."change_decision" NOT NULL,
	"comment" text,
	"typed_name" text NOT NULL,
	"consent_text_version" text NOT NULL,
	"revision_content_hash" text NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."portal_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_contact_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"scope" text[] DEFAULT '{"view","decide"}' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_exchanged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."portal_sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."portal_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"portal_grant_id" uuid NOT NULL,
	"session_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_ip" "inet",
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "app"."project_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"portal_role" "app"."portal_contact_role" DEFAULT 'approver' NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."project_members" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" "app"."project_permission" DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "app"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"site_address" text NOT NULL,
	"reference" text,
	"status" "app"."project_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."timeline_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."timeline_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"change_order_id" uuid,
	"revision_id" bigint,
	"actor_type" "app"."timeline_actor_type" NOT NULL,
	"actor_id" text,
	"event_type" text NOT NULL,
	"visibility" "app"."timeline_visibility" DEFAULT 'internal' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD COLUMN "default_tax_rate" numeric(5, 2) DEFAULT '20.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD COLUMN "portal_session_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD COLUMN "step_up_threshold" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "app"."change_attachments" ADD CONSTRAINT "change_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_attachments" ADD CONSTRAINT "change_attachments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_attachments" ADD CONSTRAINT "change_attachments_revision_id_change_order_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "app"."change_order_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_order_line_items" ADD CONSTRAINT "change_order_line_items_revision_id_change_order_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "app"."change_order_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_order_revisions" ADD CONSTRAINT "change_order_revisions_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "app"."change_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_orders" ADD CONSTRAINT "change_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."change_orders" ADD CONSTRAINT "change_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."portal_decisions" ADD CONSTRAINT "portal_decisions_revision_id_change_order_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "app"."change_order_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."portal_decisions" ADD CONSTRAINT "portal_decisions_project_contact_id_project_contacts_id_fk" FOREIGN KEY ("project_contact_id") REFERENCES "app"."project_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."portal_decisions" ADD CONSTRAINT "portal_decisions_portal_session_id_portal_sessions_id_fk" FOREIGN KEY ("portal_session_id") REFERENCES "app"."portal_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."portal_grants" ADD CONSTRAINT "portal_grants_project_contact_id_project_contacts_id_fk" FOREIGN KEY ("project_contact_id") REFERENCES "app"."project_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."portal_grants" ADD CONSTRAINT "portal_grants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."portal_sessions" ADD CONSTRAINT "portal_sessions_portal_grant_id_portal_grants_id_fk" FOREIGN KEY ("portal_grant_id") REFERENCES "app"."portal_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_contacts" ADD CONSTRAINT "project_contacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."timeline_events" ADD CONSTRAINT "timeline_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."timeline_events" ADD CONSTRAINT "timeline_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."timeline_events" ADD CONSTRAINT "timeline_events_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "app"."change_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."timeline_events" ADD CONSTRAINT "timeline_events_revision_id_change_order_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "app"."change_order_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "change_attachments_storage_path_uidx" ON "app"."change_attachments" USING btree ("storage_path");--> statement-breakpoint
CREATE INDEX "change_attachments_revision_idx" ON "app"."change_attachments" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "change_attachments_project_idx" ON "app"."change_attachments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "change_line_items_revision_idx" ON "app"."change_order_line_items" USING btree ("revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "change_revisions_order_number_uidx" ON "app"."change_order_revisions" USING btree ("change_order_id","revision_number");--> statement-breakpoint
CREATE INDEX "change_revisions_order_status_idx" ON "app"."change_order_revisions" USING btree ("change_order_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "change_orders_project_sequence_uidx" ON "app"."change_orders" USING btree ("project_id","sequence_number");--> statement-breakpoint
CREATE INDEX "change_orders_project_status_updated_idx" ON "app"."change_orders" USING btree ("project_id","lifecycle_status","updated_at");--> statement-breakpoint
CREATE INDEX "change_orders_org_idx" ON "app"."change_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_decisions_idempotency_uidx" ON "app"."portal_decisions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_decisions_revision_uidx" ON "app"."portal_decisions" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "portal_decisions_contact_idx" ON "app"."portal_decisions" USING btree ("project_contact_id");--> statement-breakpoint
CREATE INDEX "portal_decisions_session_idx" ON "app"."portal_decisions" USING btree ("portal_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_grants_token_hash_uidx" ON "app"."portal_grants" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "portal_grants_project_contact_idx" ON "app"."portal_grants" USING btree ("project_id","project_contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_sessions_session_hash_uidx" ON "app"."portal_sessions" USING btree ("session_hash");--> statement-breakpoint
CREATE INDEX "portal_sessions_grant_idx" ON "app"."portal_sessions" USING btree ("portal_grant_id");--> statement-breakpoint
CREATE INDEX "project_contacts_project_idx" ON "app"."project_contacts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "app"."project_members" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_public_id_uidx" ON "app"."projects" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "projects_org_status_updated_idx" ON "app"."projects" USING btree ("organization_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "timeline_project_cursor_idx" ON "app"."timeline_events" USING btree ("project_id","created_at","id");--> statement-breakpoint
CREATE INDEX "timeline_change_idx" ON "app"."timeline_events" USING btree ("change_order_id");--> statement-breakpoint
CREATE INDEX "timeline_revision_idx" ON "app"."timeline_events" USING btree ("revision_id");
--> statement-breakpoint
ALTER TABLE "app"."change_orders" ADD CONSTRAINT "change_orders_current_revision_fk" FOREIGN KEY ("current_revision_id") REFERENCES "app"."change_order_revisions"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "app"."change_order_revisions" ADD CONSTRAINT "change_revision_currency_check" CHECK (currency ~ '^[A-Z]{3}$'), ADD CONSTRAINT "change_revision_tax_rate_check" CHECK (tax_rate >= 0 AND tax_rate <= 100), ADD CONSTRAINT "change_revision_schedule_check" CHECK ((schedule_impact_type = 'days' AND schedule_impact_days > 0) OR (schedule_impact_type <> 'days' AND schedule_impact_days IS NULL)), ADD CONSTRAINT "change_revision_total_check" CHECK ((change_kind = 'credit' AND total <= 0) OR (change_kind IN ('no_cost', 'schedule_only') AND total = 0) OR (change_kind = 'addition' AND total >= 0));
--> statement-breakpoint
ALTER TABLE "app"."portal_grants" ADD CONSTRAINT "portal_grants_expiry_check" CHECK (expires_at > created_at);
--> statement-breakpoint
ALTER TABLE "app"."portal_sessions" ADD CONSTRAINT "portal_sessions_expiry_check" CHECK (expires_at > created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX "change_revisions_one_active_uidx" ON "app"."change_order_revisions" ("change_order_id") WHERE status IN ('sent', 'viewed');
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['projects','project_members','project_contacts','portal_grants','portal_sessions','change_orders','change_order_revisions','change_order_line_items','change_attachments','portal_decisions','timeline_events']
  LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE app.%I FROM anon, authenticated', table_name);
  END LOOP;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.protect_frozen_change_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status <> 'draft' AND ROW(
    NEW.title, NEW.description, NEW.reason, NEW.change_kind, NEW.pricing_type,
    NEW.currency, NEW.subtotal, NEW.tax_rate, NEW.tax_amount, NEW.total,
    NEW.schedule_impact_type, NEW.schedule_impact_days, NEW.response_due_at,
    NEW.client_note, NEW.frozen_at, NEW.content_hash
  ) IS DISTINCT FROM ROW(
    OLD.title, OLD.description, OLD.reason, OLD.change_kind, OLD.pricing_type,
    OLD.currency, OLD.subtotal, OLD.tax_rate, OLD.tax_amount, OLD.total,
    OLD.schedule_impact_type, OLD.schedule_impact_days, OLD.response_due_at,
    OLD.client_note, OLD.frozen_at, OLD.content_hash
  ) THEN
    RAISE EXCEPTION 'Frozen change revision content is immutable';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER protect_frozen_change_revision BEFORE UPDATE ON app.change_order_revisions FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_change_revision();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.prevent_append_only_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Append-only records cannot be updated or deleted';
END $$;
--> statement-breakpoint
CREATE TRIGGER portal_decisions_append_only BEFORE UPDATE OR DELETE ON app.portal_decisions FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();
--> statement-breakpoint
CREATE TRIGGER timeline_events_append_only BEFORE UPDATE OR DELETE ON app.timeline_events FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();
