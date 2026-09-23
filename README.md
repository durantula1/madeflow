# MadeFlow

Mobile-first пилот за договорени оферти, промени, срокове, етапи и плащания
по строителни и ремонтни обекти.

Основният поток е: обект → чернова → замразена версия → защитен линк →
одобрение, искане за промяна или отказ. Клиентът няма Supabase Auth акаунт;
bootstrap линкът създава отделна HttpOnly portal session.

## Стек

- Next.js 16.3.5, React 19.2 и TypeScript 5.9;
- Tailwind CSS 4 и shadcn с React Aria primitives;
- Supabase Auth, PostgreSQL и private Storage;
- Drizzle ORM и `postgres.js` за trusted server access.

## Локално стартиране

Изисква Node 24.19+ и pnpm 11.21.

1. Копирай `.env.example` като `.env.local`.
2. Създай отделен Supabase проект за MadeFlow.
3. Попълни publishable URL/key, server-only `DATABASE_URL` и постоянен `PORTAL_LINK_SECRET`.
4. Приложи миграциите от `drizzle/` (или еквивалентната Supabase migration).
5. Стартирай `pnpm dev`.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

## Сигурност

- raw bootstrap и session tokens никога не се записват — пази се SHA-256 hash;
- portal cookie е HttpOnly, Secure в production и SameSite=Lax; клиентският PDF маршрут проверява същата сесия;
- portal страниците са `private, no-store`, `no-referrer` и не са frame-able;
- browser-ът не чете business таблиците през Supabase Data API;
- изпратената версия пази canonical content hash и съдържанието ѝ е защитено
  от database trigger;
- решенията и timeline events са append-only и idempotent.

Пилотът не издава фактури. Старите MadeFlow passport маршрути са достъпни
само за owner, докато бъдат премахнати след пилота. Подробните стъпки за
приемане са в `docs/implementation-plan.md`.
