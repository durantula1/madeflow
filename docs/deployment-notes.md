# Бележки за пускане на сървъра (Hostinger VPS)

Приложението няма да е на Vercel, а на собствен VPS в Hostinger. Тук записваме **всичко, което трябва да се настрои**, за да не се забрави при миграцията. Файлът се допълва при всяка нова функция.

> Статус: още не е мигрирано. Засега работи локално, с базата в Supabase (проект `MadeFlow`, ref `mzmvtxjmdqucrfuajimd`, регион eu-central-1).

---

## 1. Променливи на средата (`.env` на сървъра)

Задават се в `.env.production` или в systemd/PM2 конфигурацията. **Никога в git.**

| Променлива | Задължителна | Какво е | Бележки |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | да | Публичният адрес, напр. `https://app.madeflow.bg` | Влиза в линковете към клиента, в имейлите и в auth пренасочванията. **Задава се при build**, защото е `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_URL` | да | `https://mzmvtxjmdqucrfuajimd.supabase.co` | Задава се при build. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | да | Publishable ключ от Supabase → Settings → API | Задава се при build. |
| `DATABASE_URL` | да | Postgres connection string (pooler, transaction mode) | Сървърният код чете и пише само оттук. |
| `DATABASE_MIGRATION_URL` | не | Direct connection (session mode) за миграции | Нужен само ако миграциите се пускат от сървъра. |
| `SUPABASE_SECRET_KEY` | да | Service-role/secret ключ | Нужен за файловете (прикачени файлове, **подписи**) и за изтриване на профили. Без него подписите не се записват и клиентът не може да одобри. |
| `PORTAL_LINK_SECRET` | **да, задай го изрично** | Дълъг случаен низ (`openssl rand -hex 32`) | Ако липсва, кодът взима `SUPABASE_SECRET_KEY`, а ако и той липсва, `DATABASE_URL`. **Смяна на стойността обезсилва всички клиентски линкове.** Първо провери каква стойност ползва сегашната среда и я запази. |
| `CRON_SECRET` | да | Случаен низ, поне 16 знака | Cron задачите го пращат като `Authorization: Bearer …`. |
| `RESEND_API_KEY` | да | Ключ от resend.com | Без него не тръгват имейли: линкове, кодове, разписки, напомняния. |
| `EMAIL_FROM` | да | напр. `MadeFlow <notifications@madeflow.bg>` | Домейнът трябва да е потвърден в Resend (DNS записи SPF/DKIM). |
| `NODE_ENV` | да | `production` | |

---

## 2. Cron задачи (вместо Vercel Cron)

`vercel.json` ще остане без значение. Задачите се пускат с crontab на VPS-а, като `curl` към приложението:

```cron
# Изтриване на профили след гратисния период: всеки ден в 03:00
0 3 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://app.madeflow.bg/api/cron/purge-accounts > /dev/null

# Напомняния и изтичане на оферти: всеки ден в 07:00 (Europe/Sofia)
0 7 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://app.madeflow.bg/api/cron/offer-reminders > /dev/null
```

- Провери часовата зона на сървъра (`timedatectl`). Горните часове предполагат `Europe/Sofia`. Ако сървърът е на UTC, извади 2–3 часа.
- `CRON_SECRET` трябва да е достъпен за crontab: сложи го в `/etc/environment` или директно в реда.
- Когато се добави нова cron задача, запиши я тук.

---

## 3. Reverse proxy (nginx) и HTTPS

- Next.js върви на `localhost:3000` (PM2 или systemd), а nginx е отпред. SSL е с Let's Encrypt (`certbot --nginx`).
- **Задължително се подават реалните IP адреси.** Кодът взима IP-то на клиента от `X-Forwarded-For` / `X-Real-IP` (`src/lib/http/client-ip.ts`). То се записва като доказателство при одобрение. Без тези редове всички решения ще са от `127.0.0.1`:
  ```nginx
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  ```
- `client_max_body_size 20m;`: подписът се праща в server action (до ~400 KB). Прикачените файлове отиват директно в Supabase, но лимитът трябва да е с резерв.
- Server Actions: ако домейнът зад proxy е различен, провери `experimental.serverActions.allowedOrigins` в `next.config.ts`.

---

## 4. Build и стартиране

```bash
pnpm install --frozen-lockfile
pnpm build          # next build --webpack; NEXT_PUBLIC_* трябва да са зададени ТУК
pnpm start          # или през PM2: pm2 start "pnpm start" --name madeflow
```

- Node версия: същата като локално (провери с `node -v`) или LTS ≥ 20.
- PDF-ът ползва шрифтовете в `src/modules/pdf/fonts/`. Те трябва да са на сървъра. `outputFileTracingIncludes` в `next.config.ts` ги включва, ако се ползва `output: "standalone"`.
- Помисли за `output: "standalone"` за по-лек деплой.
- **Меко спиране (graceful shutdown).** Имейлите към екипа и отговорите към клиента се пращат с `after()`, след като потребителят вече е получил отговор. При рестарт сървърът трябва да получи `SIGTERM` и да има 10–30 секунди да довърши, иначе имейлите от последните секунди се губят. PM2: `kill_timeout: 30000`. Docker: `stop_grace_period: 30s`.

---

## 5. Supabase настройки при смяна на домейна

- **Authentication → URL Configuration**:
  - Site URL = новият `NEXT_PUBLIC_APP_URL`.
  - Redirect URLs: добави `https://<домейн>/auth/callback`. Ползва се при регистрация, забравена парола и смяна на имейл.
- Имейл шаблоните на Supabase Auth, ако са персонализирани, да сочат към новия домейн.
- Storage buckets (вече създадени с миграции, нищо ръчно):
  - `change-attachments`: private, снимки и PDF към оферти;
  - `decision-signatures`: private, подписи на клиенти (добавен на 24.09.2026).
- Миграциите се прилагат само от `supabase/migrations/` (не от `drizzle/`). Последната е `20260924141118_notes_messages_notification_preferences`.

---

## 6. Имейли (Resend)

- Потвърди изпращащия домейн (SPF, DKIM, по желание DMARC) в DNS-а на домейна.
- Имейлите, които приложението праща:
  - **към клиента:** линк към офертата, код за потвърждение, разписка с PDF, „обновена оферта“ с разликите, напомняния (3 дни без решение и 2 дни преди края на срока), отговор на въпрос;
  - **към екипа:** одобрение, отказ, искане на промяна, оспорване, въпрос от клиента, изтекла оферта, оспорено плащане. Всеки служител избира кои иска в Настройки → Известия.
- Бъдещото изпращане става по-голямо. Провери лимита на плана в Resend (безплатният е 100 на ден).

---

## 7. Проверка след пускане

- [ ] Вход и регистрация работят (auth callback към новия домейн).
- [ ] Нова оферта → изпращане → имейлът стига и линкът отваря портала.
- [ ] В портала: код на имейла → подпис → одобрение. Подписът се вижда в PDF-а.
- [ ] В „Доказателство за решението“ IP адресът е реалният, не `127.0.0.1`.
- [ ] `curl` към двата cron endpoint-а с грешен ключ връща 401, а с верния връща JSON.
- [ ] Старите клиентски линкове (от преди миграцията) още работят (`PORTAL_LINK_SECRET` е същият).
- [ ] Известията на живо (Supabase Realtime) идват без презареждане.

---

## Дневник на промените в този файл

- **24.09.2026**: Фаза C. Имейл известия към екипа с `after()` (нужно е меко спиране), нови таблици за бележки, разговори и настройки за известия, bucket `decision-signatures` в изтриването на фирма.
- **24.09.2026**: първа версия. Добавени cron `offer-reminders`, bucket `decision-signatures`, бележка за `PORTAL_LINK_SECRET` и `X-Forwarded-For`.
