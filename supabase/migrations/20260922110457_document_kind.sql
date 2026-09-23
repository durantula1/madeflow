CREATE TYPE "app"."document_kind" AS ENUM ('offer', 'change');

ALTER TABLE "app"."change_orders"
  ADD COLUMN "document_kind" "app"."document_kind" NOT NULL DEFAULT 'change',
  ADD COLUMN "baseline_offer_id" uuid;

ALTER TABLE "app"."change_orders"
  ADD CONSTRAINT "change_orders_baseline_offer_id_change_orders_id_fk"
  FOREIGN KEY ("baseline_offer_id") REFERENCES "app"."change_orders"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "app"."change_orders"
  ADD CONSTRAINT "change_orders_offer_has_no_baseline"
  CHECK (
    ("document_kind" = 'offer' AND "baseline_offer_id" IS NULL)
    OR "document_kind" = 'change'
  );

DROP INDEX "app"."change_orders_project_sequence_uidx";

CREATE UNIQUE INDEX "change_orders_project_kind_sequence_uidx"
  ON "app"."change_orders" USING btree ("project_id", "document_kind", "sequence_number");

CREATE INDEX "change_orders_baseline_idx"
  ON "app"."change_orders" USING btree ("baseline_offer_id");
