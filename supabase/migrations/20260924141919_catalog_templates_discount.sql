-- Saved services and materials with their usual unit and price.
CREATE TABLE app.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 300),
  unit text CHECK (unit IS NULL OR char_length(unit) <= 20),
  unit_price numeric(14, 2) NOT NULL CHECK (unit_price >= 0),
  category text CHECK (category IS NULL OR char_length(category) <= 80),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX catalog_items_org_name_idx ON app.catalog_items (organization_id, lower(name)) WHERE archived_at IS NULL;

-- Reusable starting points for new offers: title, scope, lines and VAT.
CREATE TABLE app.offer_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  title text NOT NULL,
  description text NOT NULL,
  client_note text,
  tax_rate numeric(5, 2) NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX offer_templates_org_idx ON app.offer_templates (organization_id, created_at DESC) WHERE archived_at IS NULL;

-- Offer-level discount. subtotal stays the taxable base (after discount); lines keep their own totals.
ALTER TABLE app.change_order_revisions
  ADD COLUMN discount_type text CHECK (discount_type IN ('percent', 'amount')),
  ADD COLUMN discount_value numeric(14, 2),
  ADD COLUMN discount_amount numeric(14, 2) NOT NULL DEFAULT 0;

-- The discount is part of what the client agrees to, so a frozen version cannot change it.
CREATE OR REPLACE FUNCTION app.protect_frozen_change_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status <> 'draft' AND ROW(NEW.title, NEW.description, NEW.reason, NEW.change_kind, NEW.pricing_type, NEW.currency, NEW.subtotal, NEW.tax_rate, NEW.tax_amount, NEW.total, NEW.schedule_impact_type, NEW.schedule_impact_days, NEW.agreed_deadline, NEW.response_due_at, NEW.client_note, NEW.frozen_at, NEW.content_hash, NEW.discount_type, NEW.discount_value, NEW.discount_amount) IS DISTINCT FROM ROW(OLD.title, OLD.description, OLD.reason, OLD.change_kind, OLD.pricing_type, OLD.currency, OLD.subtotal, OLD.tax_rate, OLD.tax_amount, OLD.total, OLD.schedule_impact_type, OLD.schedule_impact_days, OLD.agreed_deadline, OLD.response_due_at, OLD.client_note, OLD.frozen_at, OLD.content_hash, OLD.discount_type, OLD.discount_value, OLD.discount_amount) THEN
    RAISE EXCEPTION 'Frozen change revision content is immutable';
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE app.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.offer_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.catalog_items FROM anon, authenticated;
REVOKE ALL ON TABLE app.offer_templates FROM anon, authenticated;
