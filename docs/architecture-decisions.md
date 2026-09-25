# Pakto architecture decisions

Status: accepted for demo implementation, 2026-09-22.

## Product boundary

- Pakto решава един проблем: навременно документиране и одобряване на
  допълнителна работа.
- България е първият пазар; един designated approver е достатъчен за демото.
- Одобрението е click approval с typed name и audit trail, без претенция за QES.
- Ценообразуването е fixed price, credit, no-cost или schedule-only.
- Изпращането е manual copy-link; AI остава незадължителен ускорител.

## Application shape

- Next.js App Router и Node.js runtime.
- Server Components четат през domain query modules.
- Server Actions обработват staff и portal mutations.
- `/access/[token]` обменя bootstrap secret за scoped device session.
- Portal browser-ът никога не използва Supabase client за business data.

## Data and immutability

- `projects` съдържа обектите и client contacts.
- `change_orders` е стабилната business identity; съдържанието живее във
  versioned `change_order_revisions`.
- След `sent` content колоните, frozen timestamp и hash са immutable.
- `portal_decisions` и `timeline_events` са append-only.
- Commercial decision и work status са отделни state machines.

## Access model

- Staff identity идва от Supabase Auth и active organization membership.
- Portal contact не е `auth.users` и няма login.
- Bootstrap grants и device sessions имат отделни hashes, expiry и revocation.
- Data API ролите нямат grants върху business таблиците; trusted server code
  връща allow-listed DTO-та.

## Transitional boundary

Legacy passport таблиците (от предишния продукт MadeFlow) и routes са запазени временно за миграция и rollback.
Новата навигация и продуктови потоци използват само модулите на Pakto.
