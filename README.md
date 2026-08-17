# MadeFlow

Работеща beta платформа за производители по поръчка: спецификация, оферта,
неизменими версии, клиентско одобрение, файлове, ръчни плащания, монтаж,
гаранции и сервиз. Stripe не е включен в beta scope-а.

## Стек

- Next.js 16.3 / React 19 / TypeScript 5.9
- Tailwind CSS 4 и shadcn с React Aria primitives
- Supabase Auth, Storage и Edge Functions
- PostgreSQL 17 / Drizzle ORM
- Vitest и Playwright

## Supabase

Hosted beta проектът е `MadeFlow Beta` (`xaydfdefyzeoulttjliz`) в
`eu-central-1`. Приложени са миграциите от [`drizzle/`](./drizzle), включително:

- 22 tenant-aware business таблици в частна `app` schema;
- deny-by-default RLS и ограничени grants;
- неизменими version/approval/activity записи;
- частен `order-files` bucket;
- platform шаблон за мебели и кухни;
- `portal-file` Edge Function за краткоживеещи клиентски downloads.

## Локално стартиране

Изисква Node `24.19.0` и pnpm `11.21.0`.

1. Копирай `.env.example` като `.env.local`.
2. В Supabase Dashboard отвори **Connect → Transaction pooler** и постави
   server-only connection string-а като `DATABASE_URL`. Не използвай този URL в
   `NEXT_PUBLIC_*` променлива и не го commit-вай.
3. Попълни публичните Supabase URL и publishable key.
4. Стартирай:

```bash
pnpm install
pnpm dev
```

`DATABASE_MIGRATION_URL` е нужен само за директно пускане на Drizzle migrations;
hosted beta миграциите вече са приложени чрез Supabase.

## Проверки

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

## Ключови граници за сигурност

- Browser-ът получава само Supabase publishable key.
- Business заявките се изпълняват server-side и винаги включват
  `organization_id`.
- Порталните tokens се съхраняват само като SHA-256 hash.
- Одобрената версия пази каноничен SHA-256 hash на спецификацията, офертата и
  template snapshot-а.
- Клиентският file resolver е достъпен само за Edge Function service role и
  валидира token hash, version manifest, expiry и revocation.

Архитектурните решения и state machine-ите са в [`docs/`](./docs).
