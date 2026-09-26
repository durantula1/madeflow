-- A sent version keeps the logo it was sent with; changing the company logo later only affects new versions.
ALTER TABLE app.change_order_revisions
  ADD COLUMN logo_storage_path text;

CREATE OR REPLACE FUNCTION app.protect_frozen_change_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status <> 'draft' AND ROW(NEW.title, NEW.description, NEW.reason, NEW.change_kind, NEW.pricing_type, NEW.currency, NEW.subtotal, NEW.tax_rate, NEW.tax_amount, NEW.total, NEW.schedule_impact_type, NEW.schedule_impact_days, NEW.agreed_deadline, NEW.response_due_at, NEW.client_note, NEW.frozen_at, NEW.content_hash, NEW.discount_type, NEW.discount_value, NEW.discount_amount, NEW.logo_storage_path) IS DISTINCT FROM ROW(OLD.title, OLD.description, OLD.reason, OLD.change_kind, OLD.pricing_type, OLD.currency, OLD.subtotal, OLD.tax_rate, OLD.tax_amount, OLD.total, OLD.schedule_impact_type, OLD.schedule_impact_days, OLD.agreed_deadline, OLD.response_due_at, OLD.client_note, OLD.frozen_at, OLD.content_hash, OLD.discount_type, OLD.discount_value, OLD.discount_amount, OLD.logo_storage_path) THEN
    RAISE EXCEPTION 'Frozen change revision content is immutable';
  END IF;
  RETURN NEW;
END $$;

-- Company logos are public branding. Server code writes optimized PNGs under <organization_id>/<sha256>.png
-- (content-addressed, never overwritten); the browser only uploads the original to <organization_id>/incoming/ via signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('organization-logos', 'organization-logos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;
