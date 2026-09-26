-- A project can hold several base offers, each its own agreement. Stages, planned installments
-- and receipts say which offer they belong to (offer_id). NULL means project level: a stage or
-- a payment that is not tied to one offer ("unassigned").

-- The composite key lets children prove the offer is in the same project.
CREATE UNIQUE INDEX change_orders_project_id_uidx ON app.change_orders (project_id, id);

ALTER TABLE app.project_milestones ADD COLUMN offer_id uuid;
ALTER TABLE app.payment_installments ADD COLUMN offer_id uuid;
ALTER TABLE app.project_receipts ADD COLUMN offer_id uuid;

ALTER TABLE app.project_milestones
  ADD CONSTRAINT project_milestones_offer_fk FOREIGN KEY (project_id, offer_id)
  REFERENCES app.change_orders (project_id, id) ON DELETE RESTRICT;
ALTER TABLE app.payment_installments
  ADD CONSTRAINT payment_installments_offer_fk FOREIGN KEY (project_id, offer_id)
  REFERENCES app.change_orders (project_id, id) ON DELETE RESTRICT;
ALTER TABLE app.project_receipts
  ADD CONSTRAINT project_receipts_offer_fk FOREIGN KEY (project_id, offer_id)
  REFERENCES app.change_orders (project_id, id) ON DELETE RESTRICT;

CREATE INDEX project_milestones_project_offer_idx ON app.project_milestones (project_id, offer_id);
CREATE INDEX payment_installments_project_offer_idx ON app.payment_installments (project_id, offer_id);
CREATE INDEX project_receipts_project_offer_idx ON app.project_receipts (project_id, offer_id);

-- offer_id must point at a base offer, not at a change.
CREATE OR REPLACE FUNCTION app.require_offer_reference() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.offer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM app.change_orders c WHERE c.id = NEW.offer_id AND c.document_kind = 'offer'
  ) THEN
    RAISE EXCEPTION 'offer_id must reference a base offer';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER project_milestones_offer_kind BEFORE INSERT OR UPDATE OF offer_id ON app.project_milestones
  FOR EACH ROW EXECUTE FUNCTION app.require_offer_reference();
CREATE TRIGGER payment_installments_offer_kind BEFORE INSERT OR UPDATE OF offer_id ON app.payment_installments
  FOR EACH ROW EXECUTE FUNCTION app.require_offer_reference();
CREATE TRIGGER project_receipts_offer_kind BEFORE INSERT OR UPDATE OF offer_id ON app.project_receipts
  FOR EACH ROW EXECUTE FUNCTION app.require_offer_reference();

-- Receipts stay append-only, with one exception: an unassigned receipt can be assigned to an
-- offer once. Nothing else about it can change.
CREATE OR REPLACE FUNCTION app.protect_project_receipt() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.offer_id IS NULL AND NEW.offer_id IS NOT NULL
    AND (to_jsonb(NEW) - 'offer_id') = (to_jsonb(OLD) - 'offer_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Append-only records cannot be updated or deleted';
END $$;

-- Until now a project had at most one base offer, so every existing row belongs to it.
-- A stage of a change belongs to that change's offer.
UPDATE app.project_milestones m
SET offer_id = coalesce(
  (SELECT c.baseline_offer_id FROM app.change_orders c WHERE c.id = m.change_order_id),
  (SELECT o.id FROM app.change_orders o WHERE o.project_id = m.project_id AND o.document_kind = 'offer' ORDER BY o.archived_at NULLS FIRST, o.created_at LIMIT 1)
);
UPDATE app.payment_installments i
SET offer_id = (SELECT o.id FROM app.change_orders o WHERE o.project_id = i.project_id AND o.document_kind = 'offer' ORDER BY o.archived_at NULLS FIRST, o.created_at LIMIT 1);

DROP TRIGGER project_receipts_append_only ON app.project_receipts;
UPDATE app.project_receipts r
SET offer_id = (SELECT o.id FROM app.change_orders o WHERE o.project_id = r.project_id AND o.document_kind = 'offer' ORDER BY o.archived_at NULLS FIRST, o.created_at LIMIT 1);
CREATE TRIGGER project_receipts_append_only BEFORE UPDATE OR DELETE ON app.project_receipts
  FOR EACH ROW EXECUTE FUNCTION app.protect_project_receipt();
