CREATE TABLE "app"."owner_role_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"requested_role" "app"."member_role",
	"remove_member" boolean DEFAULT false NOT NULL,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."payment_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"receipt_id" uuid NOT NULL,
	"project_contact_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."payment_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"milestone_id" uuid,
	"kind" "app"."payment_kind" NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"due_on" date NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"change_order_id" uuid,
	"title" text NOT NULL,
	"due_on" date NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."project_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"installment_id" uuid,
	"correction_of_id" uuid,
	"kind" "app"."payment_kind" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"method" text NOT NULL,
	"received_on" date NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."staff_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."team_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "app"."member_role" NOT NULL,
	"can_record_payments" boolean DEFAULT false NOT NULL,
	"project_ids" uuid[] DEFAULT '{}' NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."portal_grants" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."change_order_revisions" ADD COLUMN "agreed_deadline" date;--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.protect_frozen_change_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status <> 'draft' AND ROW(NEW.title, NEW.description, NEW.reason, NEW.change_kind, NEW.pricing_type, NEW.currency, NEW.subtotal, NEW.tax_rate, NEW.tax_amount, NEW.total, NEW.schedule_impact_type, NEW.schedule_impact_days, NEW.agreed_deadline, NEW.response_due_at, NEW.client_note, NEW.frozen_at, NEW.content_hash) IS DISTINCT FROM ROW(OLD.title, OLD.description, OLD.reason, OLD.change_kind, OLD.pricing_type, OLD.currency, OLD.subtotal, OLD.tax_rate, OLD.tax_amount, OLD.total, OLD.schedule_impact_type, OLD.schedule_impact_days, OLD.agreed_deadline, OLD.response_due_at, OLD.client_note, OLD.frozen_at, OLD.content_hash) THEN
    RAISE EXCEPTION 'Frozen change revision content is immutable';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
ALTER TABLE "app"."organization_members" ADD COLUMN "can_record_payments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."portal_grants" ADD COLUMN "token_ciphertext" text;--> statement-breakpoint
ALTER TABLE "app"."profiles" ADD COLUMN "email" text;--> statement-breakpoint
UPDATE app.organization_members SET role = 'office' WHERE role = 'admin';--> statement-breakpoint
UPDATE app.organization_members SET role = 'field' WHERE role = 'member';--> statement-breakpoint
UPDATE app.profiles AS profile SET email = auth_user.email FROM auth.users AS auth_user WHERE profile.id = auth_user.id;--> statement-breakpoint
ALTER TABLE "app"."owner_role_requests" ADD CONSTRAINT "owner_role_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_disputes" ADD CONSTRAINT "payment_disputes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_disputes" ADD CONSTRAINT "payment_disputes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_disputes" ADD CONSTRAINT "payment_disputes_receipt_id_project_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "app"."project_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_disputes" ADD CONSTRAINT "payment_disputes_project_contact_id_project_contacts_id_fk" FOREIGN KEY ("project_contact_id") REFERENCES "app"."project_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_installments" ADD CONSTRAINT "payment_installments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_installments" ADD CONSTRAINT "payment_installments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_installments" ADD CONSTRAINT "payment_installments_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "app"."project_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_milestones" ADD CONSTRAINT "project_milestones_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_milestones" ADD CONSTRAINT "project_milestones_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "app"."change_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_receipts" ADD CONSTRAINT "project_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_receipts" ADD CONSTRAINT "project_receipts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_receipts" ADD CONSTRAINT "project_receipts_installment_id_payment_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "app"."payment_installments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff_notifications" ADD CONSTRAINT "staff_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff_notifications" ADD CONSTRAINT "staff_notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."team_invites" ADD CONSTRAINT "team_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "owner_role_requests_org_status_idx" ON "app"."owner_role_requests" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "payment_disputes_project_status_idx" ON "app"."payment_disputes" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "payment_installments_project_due_idx" ON "app"."payment_installments" USING btree ("project_id","due_on");--> statement-breakpoint
CREATE INDEX "project_milestones_project_due_idx" ON "app"."project_milestones" USING btree ("project_id","due_on");--> statement-breakpoint
CREATE INDEX "project_receipts_org_date_idx" ON "app"."project_receipts" USING btree ("organization_id","received_on");--> statement-breakpoint
CREATE INDEX "project_receipts_project_date_idx" ON "app"."project_receipts" USING btree ("project_id","received_on");--> statement-breakpoint
CREATE INDEX "staff_notifications_user_idx" ON "app"."staff_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invites_token_hash_uidx" ON "app"."team_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "team_invites_org_email_idx" ON "app"."team_invites" USING btree ("organization_id","email");--> statement-breakpoint


-- Business tables are available only to trusted server code.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['owner_role_requests','payment_disputes','payment_installments','project_milestones','project_receipts','staff_notifications','team_invites']
  LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE app.%I FROM anon, authenticated', table_name);
  END LOOP;
END $$;

-- A private, payload-free invalidation channel per authenticated staff user.
CREATE POLICY madeflow_staff_receive ON realtime.messages
  FOR SELECT TO authenticated
  USING (realtime.topic() = 'staff:' || (select auth.uid())::text);

CREATE FUNCTION app.broadcast_staff_refresh() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM realtime.send(jsonb_build_object('id', NEW.id), 'refresh', 'staff:' || NEW.user_id::text, true);
  RETURN NEW;
END;
$$;
CREATE TRIGGER staff_notifications_refresh
AFTER INSERT ON app.staff_notifications
FOR EACH ROW EXECUTE FUNCTION app.broadcast_staff_refresh();

CREATE TRIGGER project_receipts_append_only
BEFORE UPDATE OR DELETE ON app.project_receipts
FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();

ALTER TABLE app.payment_installments ADD CONSTRAINT payment_installments_positive CHECK (amount > 0);
ALTER TABLE app.project_receipts ADD CONSTRAINT project_receipts_nonzero CHECK (amount <> 0);
ALTER TABLE app.project_milestones ADD CONSTRAINT project_milestones_status_check CHECK (status IN ('planned','in_progress','completed'));
ALTER TABLE app.payment_disputes ADD CONSTRAINT payment_disputes_status_check CHECK (status IN ('open','resolved'));
