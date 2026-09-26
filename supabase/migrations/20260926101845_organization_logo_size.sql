-- How large the logo is drawn in offers, the portal and the PDF. Branding like the logo itself:
-- it applies to sent versions too and is not part of the content hash.
ALTER TABLE app.organizations
  ADD COLUMN logo_size text NOT NULL DEFAULT 'medium' CHECK (logo_size IN ('small', 'medium', 'large'));
