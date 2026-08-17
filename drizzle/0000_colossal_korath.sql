CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."acceptance_status" AS ENUM('pending', 'accepted', 'issues');--> statement-breakpoint
CREATE TYPE "app"."actor_type" AS ENUM('user', 'customer', 'system');--> statement-breakpoint
CREATE TYPE "app"."customer_kind" AS ENUM('person', 'company');--> statement-breakpoint
CREATE TYPE "app"."file_category" AS ENUM('drawing', 'render', 'photo', 'document', 'warranty', 'installation', 'review_request');--> statement-breakpoint
CREATE TYPE "app"."member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "app"."member_status" AS ENUM('active', 'invited', 'disabled');--> statement-breakpoint
CREATE TYPE "app"."notification_status" AS ENUM('pending', 'processing', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "app"."order_stage" AS ENUM('draft', 'awaiting_approval', 'approved', 'in_production', 'ready_for_installation', 'installed', 'completed', 'service');--> statement-breakpoint
CREATE TYPE "app"."payment_kind" AS ENUM('deposit', 'progress', 'final', 'other');--> statement-breakpoint
CREATE TYPE "app"."portal_scope" AS ENUM('review', 'installation_acceptance', 'after_sales');--> statement-breakpoint
CREATE TYPE "app"."review_state" AS ENUM('comment', 'changes_requested');--> statement-breakpoint
CREATE TYPE "app"."service_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "app"."specification_field_type" AS ENUM('short_text', 'long_text', 'integer', 'decimal', 'measurement', 'single_select', 'boolean', 'date', 'money', 'colour', 'file', 'image_gallery');--> statement-breakpoint
CREATE TYPE "app"."template_scope" AS ENUM('platform', 'organization');--> statement-breakpoint
CREATE TYPE "app"."version_status" AS ENUM('published', 'awaiting_approval', 'approved', 'superseded');--> statement-breakpoint
CREATE TABLE "app"."activity_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."activity_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" uuid NOT NULL,
	"order_id" uuid,
	"actor_type" "app"."actor_type" NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"portal_link_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"approver_name" text NOT NULL,
	"approver_email" text,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"confirmation_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "app"."customer_kind" DEFAULT 'person' NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "app"."installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone,
	"installed_at" timestamp with time zone,
	"notes" text,
	"acceptance_status" "app"."acceptance_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"event_type" text NOT NULL,
	"recipient" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"status" "app"."notification_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."order_drafts" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"values_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"commercial_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"template_snapshot_json" jsonb NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revision" bigint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."order_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"category" "app"."file_category" NOT NULL,
	"storage_bucket" text DEFAULT 'order-files' NOT NULL,
	"storage_path" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_files_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "app"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"title" text NOT NULL,
	"stage" "app"."order_stage" DEFAULT 'draft' NOT NULL,
	"site_address" text,
	"target_delivery_date" date,
	"current_approved_version_id" uuid,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"current_total_minor" bigint,
	"deposit_required_minor" bigint,
	"deposit_paid_minor" bigint DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "app"."organization_members" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "app"."member_role" NOT NULL,
	"status" "app"."member_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "app"."organization_template_field_overrides" (
	"organization_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"label" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"sort_order" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_template_field_overrides_organization_id_field_id_pk" PRIMARY KEY("organization_id","field_id")
);
--> statement-breakpoint
CREATE TABLE "app"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_storage_path" text,
	"brand_color" text,
	"default_currency" char(3) DEFAULT 'EUR' NOT NULL,
	"default_locale" text DEFAULT 'bg' NOT NULL,
	"order_number_prefix" text DEFAULT 'MF' NOT NULL,
	"next_order_number" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" "app"."payment_kind" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."portal_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"scope" "app"."portal_scope" DEFAULT 'review' NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"unit" text,
	"unit_price_minor" bigint NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."review_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"portal_link_id" uuid NOT NULL,
	"state" "app"."review_state" NOT NULL,
	"message" text NOT NULL,
	"customer_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"warranty_item_id" uuid,
	"status" "app"."service_status" DEFAULT 'open' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."specification_template_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"stable_key" text NOT NULL,
	"section_key" text NOT NULL,
	"section_label" text NOT NULL,
	"label" text NOT NULL,
	"field_type" "app"."specification_field_type" NOT NULL,
	"unit" text,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"options_json" jsonb,
	"config_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "app"."specification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "app"."template_scope" NOT NULL,
	"organization_id" uuid,
	"key" text NOT NULL,
	"name_bg" text NOT NULL,
	"name_en" text,
	"version" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."specification_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "app"."version_status" DEFAULT 'published' NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"commercial_snapshot_json" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"change_summary_json" jsonb,
	"price_delta_minor" bigint,
	"delivery_delta_days" integer,
	"created_by" uuid NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	CONSTRAINT "specification_versions_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "app"."version_files" (
	"organization_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"manifest_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "version_files_version_id_file_id_pk" PRIMARY KEY("version_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "app"."warranty_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"name" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"serial_number" text,
	"warranty_start" date,
	"warranty_end" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."activity_events" ADD CONSTRAINT "activity_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_portal_link_id_portal_links_id_fk" FOREIGN KEY ("portal_link_id") REFERENCES "app"."portal_links"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_version_tenant_fk" FOREIGN KEY ("organization_id","version_id") REFERENCES "app"."specification_versions"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."installations" ADD CONSTRAINT "installations_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notification_outbox" ADD CONSTRAINT "notification_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_drafts" ADD CONSTRAINT "order_drafts_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_files" ADD CONSTRAINT "order_files_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_template_id_specification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "app"."specification_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_customer_tenant_fk" FOREIGN KEY ("organization_id","customer_id") REFERENCES "app"."customers"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."organization_template_field_overrides" ADD CONSTRAINT "organization_template_field_overrides_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."organization_template_field_overrides" ADD CONSTRAINT "organization_template_field_overrides_field_id_specification_template_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "app"."specification_template_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."portal_links" ADD CONSTRAINT "portal_links_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."portal_links" ADD CONSTRAINT "portal_links_version_tenant_fk" FOREIGN KEY ("organization_id","version_id") REFERENCES "app"."specification_versions"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."quote_items" ADD CONSTRAINT "quote_items_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."review_requests" ADD CONSTRAINT "review_requests_portal_link_id_portal_links_id_fk" FOREIGN KEY ("portal_link_id") REFERENCES "app"."portal_links"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."review_requests" ADD CONSTRAINT "review_requests_version_tenant_fk" FOREIGN KEY ("organization_id","version_id") REFERENCES "app"."specification_versions"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."service_requests" ADD CONSTRAINT "service_requests_warranty_item_id_warranty_items_id_fk" FOREIGN KEY ("warranty_item_id") REFERENCES "app"."warranty_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."service_requests" ADD CONSTRAINT "service_requests_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."specification_template_fields" ADD CONSTRAINT "specification_template_fields_template_id_specification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "app"."specification_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."specification_templates" ADD CONSTRAINT "specification_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."specification_versions" ADD CONSTRAINT "specification_versions_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."version_files" ADD CONSTRAINT "version_files_version_tenant_fk" FOREIGN KEY ("organization_id","version_id") REFERENCES "app"."specification_versions"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."version_files" ADD CONSTRAINT "version_files_file_tenant_fk" FOREIGN KEY ("organization_id","file_id") REFERENCES "app"."order_files"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."warranty_items" ADD CONSTRAINT "warranty_items_order_tenant_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "app"."orders"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_order_time_idx" ON "app"."activity_events" USING btree ("organization_id","order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_version_uidx" ON "app"."approvals" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "customers_org_name_idx" ON "app"."customers" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "customers_org_phone_idx" ON "app"."customers" USING btree ("organization_id","phone");--> statement-breakpoint
CREATE INDEX "customers_org_email_idx" ON "app"."customers" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "installations_order_uidx" ON "app"."installations" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_idempotency_uidx" ON "app"."notification_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "notification_outbox_delivery_idx" ON "app"."notification_outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_files_storage_path_uidx" ON "app"."order_files" USING btree ("storage_bucket","storage_path");--> statement-breakpoint
CREATE INDEX "order_files_order_idx" ON "app"."order_files" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_org_number_uidx" ON "app"."orders" USING btree ("organization_id","order_number");--> statement-breakpoint
CREATE INDEX "orders_org_stage_updated_idx" ON "app"."orders" USING btree ("organization_id","stage","updated_at");--> statement-breakpoint
CREATE INDEX "organization_members_user_idx" ON "app"."organization_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uidx" ON "app"."organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "payments_order_paid_idx" ON "app"."payments" USING btree ("organization_id","order_id","paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_links_token_hash_uidx" ON "app"."portal_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "portal_links_version_idx" ON "app"."portal_links" USING btree ("organization_id","version_id");--> statement-breakpoint
CREATE INDEX "quote_items_order_sort_idx" ON "app"."quote_items" USING btree ("organization_id","order_id","sort_order");--> statement-breakpoint
CREATE INDEX "review_requests_order_open_idx" ON "app"."review_requests" USING btree ("organization_id","order_id","resolved_at");--> statement-breakpoint
CREATE INDEX "service_requests_order_status_idx" ON "app"."service_requests" USING btree ("organization_id","order_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "template_fields_stable_key_uidx" ON "app"."specification_template_fields" USING btree ("template_id","stable_key");--> statement-breakpoint
CREATE INDEX "template_fields_sort_idx" ON "app"."specification_template_fields" USING btree ("template_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "specification_templates_scope_key_version_uidx" ON "app"."specification_templates" USING btree ("scope","organization_id","key","version");--> statement-breakpoint
CREATE UNIQUE INDEX "specification_versions_order_number_uidx" ON "app"."specification_versions" USING btree ("order_id","version_number");--> statement-breakpoint
CREATE INDEX "specification_versions_order_status_idx" ON "app"."specification_versions" USING btree ("organization_id","order_id","status");--> statement-breakpoint
CREATE INDEX "warranty_items_order_idx" ON "app"."warranty_items" USING btree ("organization_id","order_id");
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
ALTER TABLE "app"."profiles"
  ADD CONSTRAINT "profiles_auth_user_fk"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "app"."organization_members"
  ADD CONSTRAINT "organization_members_auth_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "app"."orders"
  ADD CONSTRAINT "orders_current_approved_version_tenant_fk"
  FOREIGN KEY ("organization_id", "current_approved_version_id")
  REFERENCES "app"."specification_versions"("organization_id", "id")
  ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "app"."orders"
  ADD CONSTRAINT "orders_currency_check"
  CHECK ("currency" ~ '^[A-Z]{3}$');
--> statement-breakpoint
ALTER TABLE "app"."organizations"
  ADD CONSTRAINT "organizations_currency_check"
  CHECK ("default_currency" ~ '^[A-Z]{3}$');
--> statement-breakpoint
ALTER TABLE "app"."specification_versions"
  ADD CONSTRAINT "specification_versions_hash_check"
  CHECK ("content_hash" ~ '^[a-f0-9]{64}$');
--> statement-breakpoint
ALTER TABLE "app"."portal_links"
  ADD CONSTRAINT "portal_links_hash_check"
  CHECK ("token_hash" ~ '^[a-f0-9]{64}$');
--> statement-breakpoint
CREATE INDEX "customers_name_trgm_idx"
  ON "app"."customers" USING gin (lower("name") gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "orders_title_trgm_idx"
  ON "app"."orders" USING gin (lower("title") gin_trgm_ops);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "app"."set_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "organizations_set_updated_at"
  BEFORE UPDATE ON "app"."organizations"
  FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "profiles_set_updated_at"
  BEFORE UPDATE ON "app"."profiles"
  FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "customers_set_updated_at"
  BEFORE UPDATE ON "app"."customers"
  FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "orders_set_updated_at"
  BEFORE UPDATE ON "app"."orders"
  FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "quote_items_set_updated_at"
  BEFORE UPDATE ON "app"."quote_items"
  FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "installations_set_updated_at"
  BEFORE UPDATE ON "app"."installations"
  FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "warranty_items_set_updated_at"
  BEFORE UPDATE ON "app"."warranty_items"
  FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();
--> statement-breakpoint
CREATE TRIGGER "service_requests_set_updated_at"
  BEFORE UPDATE ON "app"."service_requests"
  FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "app"."protect_version_payload"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.snapshot_json IS DISTINCT FROM NEW.snapshot_json
    OR OLD.commercial_snapshot_json IS DISTINCT FROM NEW.commercial_snapshot_json
    OR OLD.content_hash IS DISTINCT FROM NEW.content_hash
    OR OLD.version_number IS DISTINCT FROM NEW.version_number
    OR OLD.order_id IS DISTINCT FROM NEW.order_id
    OR OLD.organization_id IS DISTINCT FROM NEW.organization_id
  THEN
    RAISE EXCEPTION 'Published specification payloads are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "specification_versions_protect_payload"
  BEFORE UPDATE ON "app"."specification_versions"
  FOR EACH ROW EXECUTE FUNCTION "app"."protect_version_payload"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "app"."prevent_immutable_record_change"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Immutable history records cannot be updated or deleted';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "specification_versions_prevent_delete"
  BEFORE DELETE ON "app"."specification_versions"
  FOR EACH ROW EXECUTE FUNCTION "app"."prevent_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "version_files_prevent_change"
  BEFORE UPDATE OR DELETE ON "app"."version_files"
  FOR EACH ROW EXECUTE FUNCTION "app"."prevent_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "approvals_prevent_change"
  BEFORE UPDATE OR DELETE ON "app"."approvals"
  FOR EACH ROW EXECUTE FUNCTION "app"."prevent_immutable_record_change"();
--> statement-breakpoint
CREATE TRIGGER "activity_events_prevent_change"
  BEFORE UPDATE OR DELETE ON "app"."activity_events"
  FOR EACH ROW EXECUTE FUNCTION "app"."prevent_immutable_record_change"();
--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."set_updated_at"() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."protect_version_payload"() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."prevent_immutable_record_change"() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON SCHEMA "app" FROM "anon";
--> statement-breakpoint
REVOKE ALL ON SCHEMA "app" FROM "authenticated";
--> statement-breakpoint
GRANT USAGE ON SCHEMA "app" TO "authenticated";
--> statement-breakpoint
GRANT SELECT ON TABLE "app"."organization_members" TO "authenticated";
--> statement-breakpoint
ALTER TABLE "app"."organization_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "members_can_read_own_active_memberships"
  ON "app"."organization_members"
  FOR SELECT
  TO "authenticated"
  USING ((SELECT auth.uid()) = user_id AND status = 'active');
--> statement-breakpoint
INSERT INTO "storage"."buckets"
  ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES
  ('public-assets', 'public-assets', true, 15728640,
   ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('order-files', 'order-files', false, 41943040,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT ("id") DO UPDATE SET
  "public" = EXCLUDED."public",
  "file_size_limit" = EXCLUDED."file_size_limit",
  "allowed_mime_types" = EXCLUDED."allowed_mime_types";
--> statement-breakpoint
CREATE POLICY "members_can_upload_order_files"
  ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (
    bucket_id = 'order-files'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1
      FROM "app"."organization_members" membership
      WHERE membership.organization_id::text = (storage.foldername(name))[2]
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status = 'active'
    )
  );
--> statement-breakpoint
CREATE POLICY "members_can_read_order_files"
  ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (
    bucket_id = 'order-files'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1
      FROM "app"."organization_members" membership
      WHERE membership.organization_id::text = (storage.foldername(name))[2]
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status = 'active'
    )
  );
--> statement-breakpoint
CREATE POLICY "members_can_delete_order_files"
  ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (
    bucket_id = 'order-files'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1
      FROM "app"."organization_members" membership
      WHERE membership.organization_id::text = (storage.foldername(name))[2]
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status = 'active'
    )
  );
