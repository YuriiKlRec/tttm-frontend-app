# Інтеграція бекенду в новий фронтенд (frontend-1.0) — Design Spec

**Дата:** 2026-06-24
**Статус:** узгоджено, переходимо до плану реалізації

## Context

Новий фронтенд `frontend-1.0/` (React 19 + Vite + TS + Tailwind v4) повністю працює на моках
(`src/mocks/*`) і має лише живу ціну Binance (`src/services/binance.ts`) + реальний TonConnect-провайдер.
Бекенд (`backend/`: Node+Express+Sequelize+TON, Socket.IO+Redis), старий фронтенд (`frontend/`) і
дашборд (`dashboard/`: Next+Zustand+socket.io) уже реалізують повний цикл і дають готові патерни.

Мета — підключити `frontend-1.0` до бекенду на **повний життєвий цикл гри** (auth → списки →
деталі → realtime → створення → купівля квитків → фіналізація/claim як спостереження), швидко,
безпечно й стабільно, з інфініті-скролом списків, адаптацією часу під часовий пояс користувача і
dev-обходом Telegram-авторизації. Роботу виконують субагенти під оркестрацією головної сесії з
валідацією і тестуванням після кожної частини.

## Узгоджені рішення

- **Стан/realtime:** Zustand + per-game Socket.IO rooms (`join:game`). Глобальний `live` гравцям НЕ
  підключаємо (це firehose для дашборда + витік чужих даних).
- **Обсяг:** повний життєвий цикл одразу.
- **Dev-auth:** новий backend-ендпоінт `POST /api/me/dev-login` (за прапором `ADMIN_DEV_BYPASS`).
- **Інфініті-скрол:** і списки ігор, і списки ставок.
- **Лідерборд:** приховуємо лише секцію **топ-гравців на сторінці профілю** (формули ще немає).
  Списки ставок на грі та переможець (з контракту) лишаються.
- **Timezone:** беремо браузерний `Intl…timeZone` (у Telegram = TZ пристрою), надсилаємо на бекенд,
  усе форматування дат — TZ-залежне.
- **Бекенд можна дороблювати**, нову логіку документуємо в наявному `swagger-full.yaml`.

## Архітектура фронтенду (межі компонентів)

| Модуль | Відповідальність | Залежить від |
|---|---|---|
| `services/http.ts` | fetch-клієнт: baseURL з env, Bearer-токен, `ApiError`/`ValidationError(422)`, refresh-on-401 | env, auth-token |
| `services/dto/*.ts` | типи відповідей бекенду «як є» (nanoTON, сек, status, прапори) | — |
| `utils/units.ts` | чисті конвертери: `nanoToTon`, `centsToUsd`, `secToMs` | — |
| `utils/datetime.ts` (TZ) | форматування дат у TZ користувача через `Intl` | TZ зі стора |
| `services/mappers.ts` | DTO→view-моделі: `toGameCard`, `toGameDetail`, `toBet`, `derivePhase`, `deriveResultState` | dto, units, datetime |
| `store/liveStore.ts` (Zustand) | `games: Map`, `ticketsByGame`, чисті хендлери `apply*`, selector-підписки | mappers |
| `services/realtime.ts` | socket.io-client, `join`/`leave:game`, події кімнати → `liveStore.ingest` | auth-token, liveStore |
| `context/AuthProvider` | Telegram `initData`→`/api/me/auth`, інакше dev→`/api/me/dev-login`; зберігає TZ | http |
| `services/gameApi.ts` | `listGames`, `getGame`, `followGame` (через мапери) | http, mappers |
| `services/ticketApi.ts` | `prepareTicketTx`, `createTickets`, `extractHash`, `listTickets` (пагінація) | http |
| `services/walletApi.ts` | `saveWallet` | http |
| `hooks/useInfiniteGames` | інфініті-скрол списків ігор (IntersectionObserver) | gameApi |
| `hooks/useInfiniteTickets` | інфініті-скрол ставок гри | ticketApi |
| `hooks/useGameLive` | bootstrap getGame + join/leave room | gameApi, realtime, liveStore |

UI-типи у `src/types/game.ts` НЕ змінюємо — мапери наповнюють наявні поля.

## Зміни в бекенді

1. **`POST /api/me/dev-login`** (`routes/me.route.ts` + `MeController.devLogin`): доступний лише коли
   `ADMIN_DEV_BYPASS=true`, інакше 404. Приймає `{ nickname?, timezone? }`, знаходить/створює
   seed-юзера (`userService.findOrCreateDevUser`), видає JWT через `generateTokens` (дзеркалить `auth`,
   рядки 81-96 `me.controller.ts`).
2. **`GET /api/games/:id/tickets?page&perPage&mine`** (`game.route.ts` + контролер/сервіс): пагінований
   список approved-тікетів для інфініті-скролу (зараз `getGameById` віддає всі тікети — не масштабується).
   `mine=true` фільтрує за власником.
3. Обидва ендпоінти задокументувати в `swagger-full.yaml`.
4. **Не чіпаємо:** claim (авто-`GameClaimJob`), oracle/finalize, смартконтракт. Серверна валідація
   цін/унікальності квитків лишається джерелом істини.

## Дані realtime (WebSocket)

Слухаємо кімнату `game:{id}`: `game:updated`, `game:ticket_added`, `ticket:created`,
`game:finalized`, `game:claimed`; персонально `user:notification`. Оновлюють: список ставок,
пул/гравців, маркери графіка, фазу, переможця/фінальну ціну. Списки ігор оновлюються через
bootstrap + refetch (публічного «лобі»-каналу немає — додамо пізніше за потреби).

## Мапінг фаз і станів

**Фаза гри** (`derivePhase`): `active = ticketDeadlineAt > now`; `waiting = ticketDeadlineAt ≤ now < endTime`;
`finished = endTime ≤ now`. (`betCloseTime` у фронт-типах ≈ `ticketDeadlineAt`.)

**Стан Results** (`deriveResultState`, звірено з БД):
| Умова | Стан |
|---|---|
| `isFinalized && winningTicket`, мій тікет = переможний | **won** |
| `isFinalized && winningTicket`, інакше | **lost** |
| `endTime<now && !isFinalized && має тікети` | **processing** |
| `unpaid` / 0 тікетів / переможця нема | **cancelled** |

## Timezone

`AuthProvider` визначає `Intl.DateTimeFormat().resolvedOptions().timeZone` і шле на `auth`/`dev-login`
(бекенд зберігає `user.timezone`). TZ тримаємо у сторі/контексті; `utils/datetime.ts` форматує всі
дати через `Intl.DateTimeFormat(locale, { timeZone })`. Механізм єдиний для Telegram (TZ пристрою) і
dev-режиму (TZ браузера).

## Профіль

Секцію топ-гравців (лідерборд) приховуємо за прапором з коментарем «повернути після формули».
Решта профілю (нік, terms, гаманці) працює через `/api/me`.

## Оркестрація субагентів

Головна сесія — оркестратор: пише задачі, валідує (читання діфу + `tsc -b` + Playwright 390×844 +
запити проти БД), мерджить. Ізоляція — git-worktree (`frontend-1.0` і `backend` — git-репо).

- **Фаза 0 — foundation (критичний шлях, виконати/звалідувати першою):** env, `http.ts`, `dto/`,
  `units.ts`, `datetime.ts`, `mappers.ts`, `AuthProvider`. Від цього залежать усі.
- **Бекенд-трек (1 агент, послідовно — уникнути конфліктів у swagger/routes):** dev-login +
  tickets-endpoint + Swagger. Валідація: curl/Playwright проти тестових ігор у БД.
- **Фронт-треки (паралельно, розділені за теками, спільні файли read-only):**
  - F1: `store/liveStore.ts` + `realtime.ts`.
  - F2: списки + `useInfiniteGames` + `deriveResultState` у трьох сторінках.
  - F3: `GamePage` live (фази, ставки + `useInfiniteTickets`, маркери).
  - F4: транзакції CreateGame + BuyTickets (TonConnect).
  - F5: auth/onboarding + профіль (приховати лідерборд) + TZ-форматування.
  - Залежності: F2/F3 чекають F1; F4 чекає AuthProvider.

## Тестування (повний цикл, testnet, без Telegram)

- dev-login видає токен; `GET /api/me` повертає юзера; онбординг проходить.
- Списки вантажать реальні ігри з інфініті-скролом; **усі завершені ігри** видно; стани
  won/lost/processing/cancelled збігаються з БД (18 finalized = won/lost; unpaid/0-тікетів = cancelled).
- Нові **короткі ігри** (створені для тесту) дають живі фази active/waiting/processing.
- Створення гри: TonConnect або сервісний мнемонік `TON_SERVICE_WALLET_MNEMONIC` (testnet) через скрипт.
- Купівля квитків → `createTickets` → `game:ticket_added` наживо оновлює `/game/:id`.
- Авто-finalize/claim джобами → Results показує переможну ціну/корону/виплати.
- Realtime з двох вкладок: ставка в одній видно в іншій.
- `tsc -b` зелений; `swagger-full.yaml` оновлений.

## Відкриті/відкладені пункти

- Публічний «лобі»-канал для realtime-оновлення списків — відкладено (поки refetch).
- Серверне ранжування/лідерборд — після появи формули.
- Старі/проблемні контрактні ігри не блокують; покриваються БД-набором + новими короткими іграми.
- Безпека: dev-обходи лише за прапорами (вимкнути у prod); JWT у localStorage — ризик XSS зафіксовано
  (обмеження Telegram Mini App), увімкнути refresh-ротацію, не логувати токени.
