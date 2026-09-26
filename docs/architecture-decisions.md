# Pakto architecture decisions

Status: accepted for demo implementation, 2026-09-22.

## Product boundary

- Pakto решава един проблем: навременно документиране и одобряване на
  допълнителна работа.
- България е първият пазар; един designated approver е достатъчен за демото.
- Одобрението е click approval с typed name и audit trail, без претенция за QES.
- Ценообразуването е fixed price, credit, no-cost или schedule-only.
- Условията за плащане са част от офертата (виж по-долу).
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

## Offer and project

- Офертата е обещанието, обектът е изпълнението. Цена, обхват, краен срок и
  (по-късно) условия на плащане живеят във версията на офертата и се одобряват.
  Етапи, статус на работата, плащания и бележки живеят в обекта и се менят без
  одобрение.
- Договорът се чете през `change_orders.approved_revision_id` (версията в сила).
- Ориентировъчният график (`change_order_schedule_items`) е част от версията:
  етапи с дни, без дати. Замразява се и влиза в отпечатъка, но не е срок.
  След одобрение фирмата избира начална дата и го превръща в етапи на обекта
  (`project_milestones.schedule_item_id`).
- Етапите са информативни. Клиентът ги вижда едва след одобрена оферта. Етап
  след договорения краен срок е позволен, но фирмата получава предупреждение.
- Етапът сочи основната оферта или една одобрена промяна (`change_order_id`).

## Several offers in one project (2026-09-26)

- Обектът е мястото и клиентът; всяка основна оферта е отделна договореност
  със свои промени, етапи, вноски и плащания (`offer_id`). Нова работа при
  същия клиент е нова оферта в същия обект, не нов обект: един линк, едно
  обобщение. `offer_id` null = ниво обект (например аванс „за всичко“).
- Условията за плащане влизат във версията на офертата и се одобряват с нея;
  при одобрение стават вноски. Ръчни вноски остават възможни.
- Нова версия на одобрена оферта може изрично да включи („погълне“) одобрени
  промени; клиентът вижда това и го одобрява.
- Срокът в сила е от последно одобрения документ (оферта или промяна).
- Обектът има край: приключен (плащания и въпроси остават) и архив (само за
  четене). Документ, който не е одобрен, може да се анулира.
- Приемането на работата е по оферта: фирмата иска, клиентът приема с име
  или пише забележки.
- Клиентските контакти се управляват: един одобряващ, наблюдатели със свои
  линкове, смяна на одобряващия; потвърден имейл се нулира само от собственик.
- Преместен етап се вижда от клиента със старата дата и причината.
  Клиентът получава имейл за записано плащане, анулиран или изтекъл документ и
  искане за приемане, и едно дневно писмо за промени в графика.

## Access model

- Staff identity идва от Supabase Auth и active organization membership.
- Portal contact не е `auth.users` и няма login.
- Bootstrap grants и device sessions имат отделни hashes, expiry и revocation.
- Data API ролите нямат grants върху business таблиците; trusted server code
  връща allow-listed DTO-та.

## Transitional boundary

Legacy passport таблиците (от предишния продукт MadeFlow) и routes са запазени временно за миграция и rollback.
Новата навигация и продуктови потоци използват само модулите на Pakto.
