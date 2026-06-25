# E2E тестування + усунення хардкодів — план

> Продовження інтеграції (гілка `feat/backend-integration`). Мета: зробити все динамічним (де дані є в бекенді), прогнати повний on-chain цикл на testnet через сервісний мнемонік, прибрати мертвий код, задокументувати тест.

## Контекст
Інтеграцію реалізовано й перевірено на read-шляху + live socket-connect. Лишилось: (1) кілька значень захардкоджено попри наявні дані; (2) унікальні гравці рахувати на фронті; (3) не прогнано реальний on-chain цикл create→buy→finalize→claim; (4) мертвий код. Бекенд і старий фронтенд містять повну робочу логіку create/buy — використовувати як референс.

---

## Частина A — Усунення хардкодів (дані вже є в бекенді)

### A1. Глобальний shell (видно скрізь)
- `components/layout/TopBar.tsx` — `@ User_name` → `@{useAuth().user.nickname}` (fallback поки `ready=false`).
- `components/layout/StatusLine.tsx` — `10 USERS ONLINE` → реальний `connectedUsers`; `Live` → стан підключення сокета.
  - Потрібно: підключати сокет **глобально** (не лише на `/game/:id`). Додати обробку `stats:updated` у `realtime.ts` → `liveStore` (`connectedUsers`, `socketConnected`). Підключати у `AuthProvider`/`AppLayout` після auth. StatusLine читає зі стора.

### A2. Жива ціна BTC
- `pages/WaitingPage.tsx` `MOCK_PRICE` → жива ціна Binance (хук на базі `binance.ts`/`useChartData`, або легкий `useBinancePrice`).
- `pages/WelcomePage.tsx` `MOCK_PRICE` → так само.

### A3. BuyTicketsPage
- `MOCK_COUNTDOWN` → реальний відлік таймауту оплати (`VITE_PAYMENT_TIMEOUT_MINUTES`, як у старому фронті).
- `takenPrices` → з даних гри (зайняті ціни інших) замість `[]`/MOCK.
- Прибрати `usingMock`/`MOCK_PRICES`/`MOCK_TICKET_PRICE` коли є реальна гра (лишити лише безпечний fallback).

### A4. Валідація нікнейму
- `utils/nickname.ts` — прибрати захардкоджений `takenNicknames`; «зайнято» лише через бекенд (422 від `PUT /api/me` → `serverError`, вже дротяно). Лишити формат-валідацію.

### A5. Деталі/статистика гри
- `players` → унікальні гравці: `new Set(dto.tickets.map(t=>t.ownerId)).size` (додати `uniquePlayers` у `GameDetail`/мапер).
- Додати «Winner's share»/«Organizer's share» у Details, деривуючи з `authorPercent` + пул (як у старому фронті/макеті).
- Графік: `SYMBOL` → `game.targetCurrency`.
- Пара «BTC/USDT» → з `targetCurrency` (низький пріоритет; зробити, якщо дешево).

**Референс:** старий фронтенд `../frontend/src` (online-count, nickname, live price, shares).

---

## Частина B — Повний on-chain цикл (testnet, сервісний мнемонік)

Скрипт (у `backend/` або окремий node-скрипт) використовує `TON_SERVICE_WALLET_MNEMONIC` (testnet) як гаманець гравця/організатора, підписує підготовлені транзакції й проганяє цикл. Бекенд має всю логіку (`tonService`), старий фронт — послідовність викликів.

**Кроки:**
1. **dev-login (partner)** → токен (роль `partner` для create).
2. **Create:** `POST /api/games/transaction` → підписати+відправити BOC сервісним гаманцем (@ton/ton WalletContractV4 + mnemonic) → `POST /api/games` (записати). Гра з короткими часами: `ticketDeadline` ≈ now+3хв, `endTime` ≈ now+5хв (щоб джоби finalize/claim спрацювали швидко).
3. **Buy:** `POST /api/tickets/transaction {gameId, prices}` → підписати+відправити → `POST /api/tickets {gameId, prices, boc}`. Перевірити, що тікети створились (`approved` синхронізується `ContractTicketSyncJob`).
4. **Realtime:** під час купівлі відкрита сторінка гри (Playwright) має отримати `game:ticket_added` наживо (перевірка C1-адаптера на РЕАЛЬНІЙ події — головна мета).
5. **Finalize:** дочекатися `endTime` → `GameFinalizationJob` (cron `*/2`) фіналізує (oracle Binance) → `game:finalized`. Перевірити `isFinalized`, `winningTicketId`, `oracleFinalPrice` у БД + у UI.
6. **Claim:** `GameClaimJob` клеймить → `game:claimed`, `isClaimed=true`. Перевірити виплати (`onchainFinance`/баланс контракту через `getChildContractConfig`).
7. Звірити кожне поле UI з БД та on-chain (tonviewer testnet).

**Очікувані realtime-події (головна валідація):** `game:ticket_added` (купівля), `game:finalized`, `game:claimed` — мають коректно оновити стор без `$NaN`/крашу (перевірка C1 на живих даних).

---

## Частина C — Прибирання мертвого коду (ПІСЛЯ успіху A+B)
- `liveStore.appendTickets` (не викликається — або задіяти для bulk-load), `ticketApi.extractHash` (не викликається), `units.secToMs` (не викликається), мапер `derivePhase` (замінений `GamePage.computePhase`).
- Перенести типи `ResultGame/ResultBet/WaitGame/WaitBet/ResultStatus` з `src/mocks/` у `src/types/` (сервісний шар не має залежати від `mocks/`).
- Прибрати решту `MOCK_*`, що стали непотрібні.
- Прибрати тимчасові console.log.

---

## Частина D — Регресія (Playwright, 390×844)
Після кожної частини: `tsc -b` зелено; перепройти:
- `/` (Predictions), `/waiting`, `/results` — реальні дані, інфініті-скрол, дати в TZ, **онлайн-лічильник живий, нік користувача правильний**.
- `/game/:id` finished — ставки/деталі/переможець, унікальні гравці, без футера.
- Онбординг `/welcome`→`/terms`→`/profile` — нік через бекенд, без захардкодженого «зайнято».
- 0 помилок у консолі.

## Порядок виконання
A (хардкоди) → B (on-chain цикл, головна валідація realtime) → C (чистка) → D (фінальна регресія). Кожен крок — субагент + валідація оркестратором.
