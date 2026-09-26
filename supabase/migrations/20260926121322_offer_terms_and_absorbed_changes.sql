-- Two more parts of what the client approves in an offer version, frozen with it:
--   payment terms: when and how much of the offer total is due;
--   absorbed changes: approved changes this new version already includes, so they stop adding to the price.

-- Child rows of a sent version cannot change (the same rule as line items and the schedule).
CREATE OR REPLACE FUNCTION app.protect_frozen_revision_child() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  IF EXISTS (
    SELECT 1 FROM app.change_order_revisions r
    WHERE r.frozen_at IS NOT NULL
      AND r.id IN (CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.revision_id END, CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.revision_id END)
  ) THEN
    RAISE EXCEPTION 'The content of a sent version cannot change';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE TABLE app.change_order_payment_terms (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  revision_id bigint NOT NULL REFERENCES app.change_order_revisions(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 180),
  percent numeric(5, 2) NOT NULL CHECK (percent > 0 AND percent <= 100),
  due_trigger text NOT NULL CHECK (due_trigger IN ('on_approval', 'on_stage', 'on_completion', 'on_date')),
  due_on date,
  schedule_line_key uuid,
  CHECK ((due_trigger = 'on_date') = (due_on IS NOT NULL)),
  CHECK ((due_trigger = 'on_stage') = (schedule_line_key IS NOT NULL)),
  UNIQUE (revision_id, position)
);
CREATE TRIGGER protect_frozen_payment_term
  BEFORE INSERT OR UPDATE OR DELETE ON app.change_order_payment_terms
  FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_revision_child();

CREATE TABLE app.revision_absorbed_changes (
  revision_id bigint NOT NULL REFERENCES app.change_order_revisions(id) ON DELETE CASCADE,
  change_order_id uuid NOT NULL REFERENCES app.change_orders(id) ON DELETE CASCADE,
  PRIMARY KEY (revision_id, change_order_id)
);
CREATE INDEX revision_absorbed_changes_change_idx ON app.revision_absorbed_changes (change_order_id);
CREATE TRIGGER protect_frozen_absorbed_change
  BEFORE INSERT OR UPDATE OR DELETE ON app.revision_absorbed_changes
  FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_revision_child();

-- Set when the offer version that absorbs this change is approved; the change then stops counting.
ALTER TABLE app.change_orders
  ADD COLUMN absorbed_by_revision_id bigint REFERENCES app.change_order_revisions(id) ON DELETE SET NULL;

-- The payment term an installment was generated from, if any.
ALTER TABLE app.payment_installments
  ADD COLUMN term_id bigint REFERENCES app.change_order_payment_terms(id) ON DELETE SET NULL;

ALTER TABLE app.change_order_payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.revision_absorbed_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.change_order_payment_terms FROM anon, authenticated;
REVOKE ALL ON TABLE app.revision_absorbed_changes FROM anon, authenticated;
