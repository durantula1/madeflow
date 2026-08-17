# MadeFlow beta implementation plan

1. Foundation: exact stable dependencies, Node 24, shadcn/React Aria, design tokens, environment validation, CI scripts.
2. Platform: Supabase project, Drizzle schema, migrations, seed, private buckets, Auth, organization bootstrap, tenant authorization.
3. Passport: customers, order creation and numbering, templates, drafts, autosave, files, search, activity, responsive workspace.
4. Approval milestone: commercial snapshot, deterministic hashing, immutable publishing, diff, portal tokens, customer approval/change requests, production lock, email outbox.
5. Completion workflows: quote items, manual payments, PDF exports, installation, warranty, service history, final passport.
6. Public product: marketing routes, motion story, lazy 3D enhancement, reduced motion, SEO, PWA assets.
7. Release: unit/integration/E2E, Supabase security and performance advisors, dependency audit, accessibility, bundle and performance verification.

## Current implementation status

Stages 1–7 are implemented. Unit tests, desktop/mobile public E2E and the
production build pass. The hosted Supabase schema, Storage buckets and
`portal-file` Edge Function are active. A local `DATABASE_URL` must be supplied
from the Supabase Dashboard before authenticated runtime E2E can run, because
the connector intentionally does not expose database passwords.

No Git commits are created automatically.
