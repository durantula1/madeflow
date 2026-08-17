# MadeFlow architecture decisions

Status: accepted for beta implementation, 2026-08-15.

## Product boundary

- MadeFlow is a digital passport and approval workflow for made-to-order products.
- The beta is a complete working product without Stripe or paid subscriptions.
- The first vertical is custom furniture and kitchens.
- Bulgarian is the launch language; copy lives in structured dictionaries.
- The browser application is responsive and installable, but offline workflows are out of scope.

## Application shape

- One Next.js 16 modular monolith using App Router and Node.js runtime.
- Server Components perform reads; Server Actions perform authenticated UI mutations.
- Route Handlers are reserved for public approval, storage signing/finalization, auth callbacks, exports, and provider callbacks.
- Business modules own validation, authorization, domain transitions, and persistence.

## Supabase boundary

- Supabase provides Auth, PostgreSQL, and private Storage.
- `@supabase/ssr` owns cookie-based Auth sessions.
- Drizzle and `postgres.js` own business-table access from trusted server code.
- Business tables live in the non-exposed `app` schema.
- Browser code never queries business tables directly.
- Runtime uses a transaction-pooler connection with prepared statements disabled; migrations use a direct connection.

## Tenant boundary

- Every business entity has a non-null `organization_id`.
- Every server operation derives tenant context from a verified Supabase identity and active membership.
- Client-provided organization IDs are never trusted.
- Repository queries require an organization ID and enforce it in SQL.
- Composite constraints prevent cross-tenant references where practical.

## Version and approval model

- Drafts are mutable rows in `order_drafts`, not specification versions.
- Published versions use `published`, `awaiting_approval`, `approved`, or `superseded`.
- A request for changes is an append-only `review_request`; it does not mutate version content.
- The canonical hash covers specification, commercial terms, promised date, and the immutable file manifest.
- Approval is idempotent and atomically switches the order's current production version.
- Published snapshot payloads and version-file manifests are protected by database triggers.

## Reliability

- Domain state commits before email delivery.
- Transactional email is recorded in an outbox with retries and idempotency keys.
- Public tokens contain at least 32 random bytes; only SHA-256 hashes are stored.
- Order numbers are allocated transactionally per organization.

## UI foundation

- shadcn 4 with one React Aria component base.
- MadeFlow-specific OKLCH tokens, typography, and components replace preset visuals.
- Three.js is isolated to dynamically loaded marketing islands and is never imported by workspace routes.

