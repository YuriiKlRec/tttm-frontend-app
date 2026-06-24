# Backend → frontend-1.0 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Підключити `frontend-1.0` (зараз на моках) до реального бекенду на повний життєвий цикл гри з realtime, dev-auth, інфініті-скролом і timezone.

**Architecture:** Шар-адаптер DTO→view-моделі (мапери) ізолює одиниці/типи бекенду; Zustand-стор + per-game Socket.IO кімнати для realtime; fetch-клієнт з Bearer-токеном; dev-login для тесту без Telegram. Субагенти виконують задачі в git-worktree, головна сесія валідує (tsc + Playwright + БД) і мерджить.

**Tech Stack:** React 19, Vite, TypeScript (strict, без `any`), Tailwind v4, react-router-dom v7, zustand, socket.io-client, @tonconnect/ui-react, @telegram-apps/sdk. Бекенд: Express + Sequelize + TON + Socket.IO.

**Reference (старий фронтенд, читати, НЕ копіювати наосліп):** `../frontend/src/services/{base-http,auth,games,tickets,wallet}.service.ts`, `../frontend/src/contexts/{AuthContext,WebSocketContext}.tsx`, `../frontend/src/hooks/{useInfiniteGames,useInfiniteScroll,useOrderPayment}.ts`, `../frontend/src/pages/{CreateGame,Checkout,GamePage}.tsx`.

## Global Constraints

- Усі пояснення/коментарі в коді — українською. Технічні ідентифікатори — як є.
- TypeScript strict, **без `any`** (бекенд має `any` — у фронті обгортаємо в типізовані DTO).
- Компоненти ≤ 150 рядків, функції ≤ 40 рядків. Весь код у `src/`.
- API-виклики ТІЛЬКИ у `src/services/*`; UI/компоненти не викликають `fetch` напряму.
- Tailwind v4 (CSS-first `@theme`); без inline-стилів і jQuery.
- Одиниці бекенду: `ticketAmount`/`price` у nanoTON (int); `oracleFinalPrice`/ціни BTC у центах (×100); час у секундах в JWT, але `endTime`/`ticketDeadlineAt` — ISO-рядки. Фронт відображає TON-рядки, $, ms.
- Glob `live` (firehose) гравцям НЕ підключати — лише `game:{id}` + `user:{id}`.
- Dev-обходи лише за прапором (`ADMIN_DEV_BYPASS` на бекенді, `VITE_DEV_BYPASS_AUTH` на фронті); вимкнені в prod.
- Коміти: англійською, імперативно, ≤70 символів; **окремо** per-repo (`frontend-1.0` і `backend`); після команди користувача. Підпис коміту:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Немає unit-тест-фреймворку → верифікація задачі = `npx tsc -b` (зелено) + цільова перевірка Playwright (390×844) або `curl`/`docker exec mysql` проти БД.

## Environment / тест-дані

- Бекенд локально: `PORT=4003`, `TON_NETWORK=testnet`, `ADMIN_DEV_BYPASS=true`, Redis+MySQL (docker `tttm-mysql-1` :3307).
- БД: 40 ігор (усі за `endTime`): 18 `isFinalized&isClaimed` з переможцем (won/lost), решта `unpaid`/0-тікетів (cancelled). 0 ігор у фазах active/waiting → створюємо короткі тестові ігри.
- DB-запит: `docker exec tttm-mysql-1 mysql -uroot -proot_password tttm -e "<SQL>"`.

## File Structure (frontend-1.0/src)

| Файл | Відповідальність |
|---|---|
| `config/env.ts` | читання `import.meta.env`: API URL, WS URL, dev-bypass, TON network |
| `services/http.ts` | fetch-клієнт + `ApiError`/`ValidationError` + Bearer + refresh-on-401 |
| `services/dto/{game,ticket,user,wallet}.dto.ts` | типи відповідей бекенду |
| `utils/units.ts` | `nanoToTon`, `centsToUsd`, `secToMs` |
| `utils/datetime.ts` | TZ-форматування (доповнити наявний) |
| `services/mappers.ts` | `toGameCard/toGameDetail/toBet/derivePhase/deriveResultState` |
| `store/liveStore.ts` | Zustand: games Map, ticketsByGame, `apply*`, `ingest` |
| `services/realtime.ts` | socket.io-client connect/join/leave |
| `context/AuthProvider.tsx`, `hooks/useAuth.ts` | auth (Telegram/dev) + token + TZ |
| `services/{gameApi,ticketApi,walletApi}.ts` | REST-виклики (через мапери) |
| `hooks/{useInfiniteGames,useInfiniteTickets,useGameLive}.ts` | дані для сторінок |

backend/src:
| Файл | Зміна |
|---|---|
| `routes/me.route.ts`, `controllers/me.controller.ts`, `services/user.service.ts` | `POST /me/dev-login` |
| `routes/game.route.ts`, `controllers/game.controller.ts`, `services/game.service.ts` | `GET /games/:id/tickets` |
| `swagger-full.yaml` | документація обох |

---

## Phase 0 — Foundation (sequential, blocker для решти)

### Task 0.1: Env + HTTP-клієнт + DTO + units

**Files:**
- Create: `src/config/env.ts`, `src/services/http.ts`, `src/services/dto/game.dto.ts`, `src/services/dto/ticket.dto.ts`, `src/services/dto/user.dto.ts`, `src/services/dto/wallet.dto.ts`, `src/utils/units.ts`
- Create: `.env`, `.env.example`

**Interfaces produced:**
- `env`: `{ apiBaseUrl: string; wsUrl: string; devBypassAuth: boolean; tonNetwork: 'testnet'|'mainnet' }`
- `http`: `{ get<T>(p): Promise<T>; post<T>(p, body?): Promise<T>; put<T>(p, body?): Promise<T>; setToken(t: string|null): void }`; класи `ApiError(status, message)`, `ValidationError(errors: string[])` (status 422).
- DTO: `GameDto` (поля бекенду: `id,name,targetCurrency,ticketAmount:number,authorPercent,endTime:string,ticketDeadlineAt:string,status:'new'|'unpaid'|'active'|'expired',isFinalized,isClaimed,oracleFinalPrice:number|null,winningTicketId:string|null,tonData:{contractAddress,network,...},owner:UserDto,wallet:WalletDto|null,tickets:TicketDto[],winningTicket:TicketDto|null}`), `TicketDto{id,price:number,gameId,ownerId,createdAt,owner:UserDto,tonData:{transactionHash,boc}|null}`, `UserDto{id,nickname,role,termsAccepted,timezone:string|null,wallets:WalletDto[]}`, `WalletDto{id,address,network,isActive}`, `Paginated<T>={data:T[];meta:{page,perPage,total}}`.
- `units`: `nanoToTon(n:number):string` (ділить на 1e9, обрізає нулі), `centsToUsd(c:number):string` (`$57,342.47`), `secToMs(s:number):number`.

- [ ] **Step 1:** Створити `.env`/`.env.example`: `VITE_API_BASE_URL=http://localhost:4003`, `VITE_WS_URL=`, `VITE_DEV_BYPASS_AUTH=true`, `VITE_TON_NETWORK=testnet`. `env.ts` читає з фолбеками (порожній `VITE_WS_URL` → `apiBaseUrl`).
- [ ] **Step 2:** `units.ts` з чистими функціями (референс форматів — моки `gameDetail.ts`: `$62,542.47`, `0.1`).
- [ ] **Step 3:** `dto/*.ts` — інтерфейси вище (звірити поля з `backend/src/models/{game,ticket,user,wallet}.ts`).
- [ ] **Step 4:** `http.ts` за зразком `../frontend/src/services/base-http.service.ts`: baseURL з `env`, заголовок `Authorization: Bearer` з токена в модулі (`setToken`), кидає `ApiError`/`ValidationError` на `!res.ok`/422.
- [ ] **Step 5 (verify):** `npx tsc -b` — зелено.
- [ ] **Step 6 (verify):** тимчасовий `console.log(env)` у `main.tsx` → `npm run dev`, Playwright `browser_navigate` localhost:5173, `browser_console_messages` показує коректний `apiBaseUrl`. Прибрати лог.

### Task 0.2: Мапери (DTO → view-моделі)

**Files:** Create `src/utils/datetime.ts` (TZ), `src/services/mappers.ts`. Test через тимчасовий скрипт.

**Interfaces consumed:** `units`, `dto`, типи `src/types/game.ts` (`Game`, `GameDetail`, `Bet`).
**Interfaces produced:**
- `derivePhase(dto: GameDto, now: number): 'active'|'waiting'|'finished'`
- `deriveResultState(dto: GameDto, myUserId: string|null): 'won'|'lost'|'processing'|'cancelled'`
- `toGameCard(dto): Game`, `toGameDetail(dto): GameDetail`, `toBet(t: TicketDto, opts:{finalPrice?:number; mine:boolean; win:boolean}): Bet`
- `formatInTz(iso: string, tz: string|null, opts?): string` у `datetime.ts`.

- [ ] **Step 1:** `datetime.ts`: `formatInTz` через `Intl.DateTimeFormat(undefined,{timeZone:tz??undefined,...})`; зберегти наявні експорти (`formatCountdown`,`formatDateTime`) і додати TZ-варіант.
- [ ] **Step 2:** `mappers.ts`: `derivePhase` (`active=ticketDeadlineAt>now; waiting=ticketDeadlineAt≤now<endTime; finished=endTime≤now`), `deriveResultState` (таблиця зі спеки: won/lost/processing/cancelled), `toGameCard`/`toGameDetail` (nanoToTon для цін, secToMs/ISO для часу, `betCloseTime=ticketDeadlineAt`), `toBet`.
- [ ] **Step 3 (verify):** тимчасовий `src/__check.ts` з прикладами DTO (взяти реальні з `docker exec ... mysql` — гра `1af59fc9…` won, `02ea6cd4…` cancelled) → `npx tsx src/__check.ts` друкує очікувані стани. Прибрати файл.
- [ ] **Step 4 (verify):** `npx tsc -b` зелено.

### Task 0.3: AuthProvider + dev-login (фронт-частина)

**Files:** Create `src/context/AuthProvider.tsx`, `src/hooks/useAuth.ts`. Modify `src/app/App.tsx` (обгорнути), `src/services/http.ts` (виклик `setToken`).
**Depends on:** 0.1; **Backend Task B.1** (ендпоінт dev-login) — узгодити інтерфейс, але фронт можна писати паралельно проти контракту нижче.

**Interface consumed (бекенд):** `POST /api/me/dev-login {nickname?,timezone?}` → `{user:UserDto,accessToken,refreshToken,accessTokenExpiresAt,refreshTokenExpiresAt}` (як `/auth`). `GET /api/me` → `UserDto`.
**Interface produced:** `useAuth(): { user: UserDto|null; tz: string; ready: boolean; login(): Promise<void>; refreshUser(): Promise<void> }`.

- [ ] **Step 1:** `AuthProvider`: на mount визначити `tz=Intl.DateTimeFormat().resolvedOptions().timeZone`; якщо є Telegram `initData` (`@telegram-apps/sdk`) → `POST /api/me/auth {initData,timezone:tz}`; інакше якщо `env.devBypassAuth` → `POST /api/me/dev-login {timezone:tz}`. Зберегти токени (localStorage, як `../frontend/src/services/auth.service.ts`, конверсія expiresAt сек→ms), `http.setToken(accessToken)`, `GET /api/me`.
- [ ] **Step 2:** refresh-on-401 у `http.ts`: при 401 — `POST /api/me/refresh {refreshToken}`, оновити токен, повторити запит один раз.
- [ ] **Step 3:** обгорнути `App.tsx` у `<AuthProvider>` (між TonConnect і BookedCart).
- [ ] **Step 4 (verify):** бекенд із B.1 запущений; `npm run dev`; Playwright → localhost:5173, console показує отриманого `user`; `Application > localStorage` має `accessToken`.

---

## Backend track (1 агент, sequential — уникнути конфліктів swagger/routes)

### Task B.1: `POST /api/me/dev-login`

**Files:** Modify `backend/src/routes/me.route.ts`, `backend/src/controllers/me.controller.ts`, `backend/src/services/user.service.ts`, `backend/swagger-full.yaml`.

**Interface produced:** `POST /api/me/dev-login` body `{nickname?:string,timezone?:string}` → той самий shape, що `auth` (рядки 90-96 `me.controller.ts`). 404 коли `ADMIN_DEV_BYPASS!=='true'`.

- [ ] **Step 1:** `user.service.ts`: метод `findOrCreateDevUser(nickname='dev_player'): Promise<User>` — `findOrCreate` за стабільним маркером (напр. `tgChatId='dev-'+nickname`), `role:'player'`, `termsAccepted:true`.
- [ ] **Step 2:** `me.controller.ts`: `devLogin` — guard `process.env.ADMIN_DEV_BYPASS==='true'` (інакше `res.status(404)`), створити юзера, зберегти `timezone` якщо передано, `generateTokens({id,role})`, повернути як `auth`.
- [ ] **Step 3:** `me.route.ts`: `router.post('/dev-login', MeController.devLogin)` (без `authMiddleware`).
- [ ] **Step 4 (verify):** `curl -s -XPOST localhost:4003/api/me/dev-login -H 'Content-Type: application/json' -d '{"timezone":"Europe/Kyiv"}'` повертає токени+user; з `ADMIN_DEV_BYPASS=false` → 404.
- [ ] **Step 5:** додати шлях у `swagger-full.yaml` (теги/схема відповіді як у `/me/auth`).

### Task B.2: `GET /api/games/:id/tickets` (пагінація)

**Files:** Modify `backend/src/routes/game.route.ts`, `backend/src/controllers/game.controller.ts`, `backend/src/services/game.service.ts`, `backend/swagger-full.yaml`.

**Interface produced:** `GET /api/games/:id/tickets?page=1&perPage=20&mine=false` → `{data:TicketDto[],meta:{page,perPage,total}}` (approved-тікети, include owner, `order createdAt DESC`; `mine=true` → `ownerId=req.user.id`).

- [ ] **Step 1:** `game.service.ts`: `listGameTickets(gameId,page,perPage,mineUserId?)` через `Ticket.scope('approved').findAndCountAll` (include `owner`).
- [ ] **Step 2:** контролер `listTickets` (читає `page/perPage/mine`, `req.user?.id`), маршрут `router.get('/:id/tickets', authMiddleware, GameController.listTickets)`.
- [ ] **Step 3 (verify):** `curl` для гри з тікетами (напр. одна з 19 games_with_tickets) повертає пагіновані дані; `meta.total` збігається з `SELECT COUNT(*) FROM tickets WHERE gameId=...`.
- [ ] **Step 4:** документувати у `swagger-full.yaml`.

---

## Phase 1 — Realtime core

### Task F1: liveStore (Zustand) + realtime.ts + useGameLive

**Files:** Create `src/store/liveStore.ts`, `src/services/realtime.ts`, `src/hooks/useGameLive.ts`. Modify `package.json` (додати `zustand`, `socket.io-client`).
**Depends on:** 0.1, 0.2. **Reference:** `../frontend/src/contexts/WebSocketContext.tsx`, `dashboard/src/store/{liveStore,liveHandlers}.ts`.

**Interfaces produced:**
- `liveStore` (Zustand): state `{ games: Map<string,GameDetail>; ticketsByGame: Map<string,Bet[]>; }`; actions `setGame(d:GameDetail)`, `ingest(event:{type:string;payload:unknown})`, `appendTickets(gameId, Bet[])`.
- `realtime`: `connectRealtime(token:string|null):void`, `joinGame(id):void`, `leaveGame(id):void`, `disconnectRealtime():void`.
- `useGameLive(id:string): { game: GameDetail|null; ready: boolean }`.

- [ ] **Step 1:** `npm i zustand socket.io-client`.
- [ ] **Step 2:** `liveStore.ts` — Zustand store з Map-ами, чисті хендлери `applyGameUpdated/applyTicketAdded` (через мапери), `ingest` диспетчеризує за `event.type` (`game:updated`,`game:finalized`,`game:claimed`,`game:ticket_added`,`ticket:created`).
- [ ] **Step 3:** `realtime.ts` — `io(env.wsUrl, {auth:{token}, transports:['websocket','polling'], path:'/socket.io/'})`; підписки на події кімнати → `liveStore.getState().ingest`; `joinGame`→`emit('join:game',id)`.
- [ ] **Step 4:** `useGameLive` — на mount `gameApi.getGame(id)` → `setGame`, `connectRealtime`+`joinGame`; на unmount `leaveGame`. (gameApi з F2 — оголосити сигнатуру, реалізувати тут мінімальний `getGame`, якщо F2 ще нема.)
- [ ] **Step 5 (verify):** `npx tsc -b` зелено; Playwright відкриває `/game/:id` реальної гри — стор наповнюється (console-лог тимчасово).

---

## Phase 2 — Feature tracks (паралельно після F1; спільні файли read-only)

### Task F2: Списки + інфініті-скрол + 3 сторінки

**Files:** Create `src/services/gameApi.ts`, `src/hooks/useInfiniteGames.ts`. Modify `src/pages/{PredictionsPage,WaitingPage,ResultsPage}.tsx` (заміна моків). **Reference:** `../frontend/src/hooks/{useInfiniteGames,useInfiniteScroll}.ts`.

**Interfaces produced:** `gameApi.listGames(filter:{kind:'predictions'|'waiting'|'results';page;perPage}): Promise<{items:Game[];total:number}>`; `useInfiniteGames(kind): {items:Game[];loadMore();hasMore;loading}`.

- [ ] **Step 1:** `gameApi.ts` — `listGames` → `GET /api/games?page&perPage&is{Predictions|Waiting|Results}=true`, мапить `data` через `toGameCard`. Для Results — `deriveResultState` зберігати у Game (розширити при потребі через додаткове поле картки).
- [ ] **Step 2:** `useInfiniteGames` — IntersectionObserver-сентинел, акумуляція сторінок, `hasMore = items.length<total`.
- [ ] **Step 3:** під'єднати `PredictionsPage`/`WaitingPage`/`ResultsPage` до хука; Results групувати наявним `utils/groupByDate.ts`; стан картки з `deriveResultState`; прибрати імпорти моків.
- [ ] **Step 4 (verify):** Playwright: `/results` показує реальні завершені ігри; скрол вантажить наступну сторінку; стани won/lost/cancelled збігаються з БД-вибіркою.

### Task F3: GamePage live + інфініті-скрол ставок

**Files:** Modify `src/pages/GamePage.tsx` (замінити моки на `useGameLive`), Create `src/hooks/useInfiniteTickets.ts`. Modify `src/components/games/PredictionsView.tsx` (приймати ставки ззовні + сентинел).
**Depends on:** F1, B.2.

**Interface produced:** `useInfiniteTickets(gameId,mine:boolean): {bets:Bet[];loadMore();hasMore;loading}` (через `ticketApi.listTickets`).

- [ ] **Step 1:** `ticketApi.listTickets(gameId,page,perPage,mine)` → `GET /api/games/:id/tickets`, мапить через `toBet` (mine = ownerId===user.id; win = ticket.id===game.winningTicketId).
- [ ] **Step 2:** `useInfiniteTickets` (як `useInfiniteGames`).
- [ ] **Step 3:** `GamePage` бере `game` з `useGameLive`; фаза через `derivePhase`; список ставок Predictions — з `useInfiniteTickets`; маркери графіка/пул/гравці з `game`; realtime `game:ticket_added` додає нову ставку без рефетчу.
- [ ] **Step 4:** прибрати DEV-перемикач фази (або лишити під `env.devBypassAuth`).
- [ ] **Step 5 (verify):** Playwright на завершеній грі (з тікетами) — список вантажиться зі скролом; на новій короткій грі (створити) — фази active→waiting коректні.

### Task F4: Транзакції CreateGame + BuyTickets (TonConnect)

**Files:** Create `src/services/{ticketApi,walletApi}.ts` (доповнити ticketApi prepare/create), Modify `src/pages/CreateGamePage.tsx`, `src/pages/BuyTicketsPage.tsx`. **Reference:** `../frontend/src/pages/CreateGame.tsx`, `../frontend/src/hooks/useOrderPayment.ts`.
**Depends on:** 0.3 (auth), B.* опційно.

**Interfaces produced:** `gameApi.createGameTransaction(req)`, `gameApi.createGame(req)`, `ticketApi.prepareTicketTx({gameId,prices})`, `ticketApi.createTickets({gameId,prices,boc})`, `ticketApi.extractHash(boc)`, `walletApi.saveWallet(address,network)`.

- [ ] **Step 1:** `walletApi.saveWallet` → `POST /api/wallets`; викликати після TonConnect-конекту (зберегти гаманець користувача).
- [ ] **Step 2:** `CreateGamePage`: на submit → `POST /api/games/transaction` → `tonConnectUI.sendTransaction({validUntil,messages:[{address:to,amount:value,payload,stateInit}]})` → `POST /api/games`. Дані форми з наявного `useCreateGameForm`.
- [ ] **Step 3:** `BuyTicketsPage`: чанки по 8 (`utils/chunk.ts`) → на чек: `prepareTicketTx` → `sendTransaction` → `createTickets`; 422 → відповідні модалки (taken/uncompleted) у `BuyModals`.
- [ ] **Step 4 (verify):** testnet через TonConnect АБО скрипт із `TON_SERVICE_WALLET_MNEMONIC`: створити коротку гру (deadline +5хв, end +10хв) → з'являється у Predictions; купити квиток → `game:ticket_added` наживо.

### Task F5: Onboarding/Profile + приховати лідерборд + TZ-форматування

**Files:** Modify `src/pages/{WelcomePage,TermsPage,ProfilePage}.tsx`, `src/components/onboarding/NicknameField.tsx`, усі місця форматування дат (`Timer.tsx`, картки) → `formatInTz`. Create `src/services/meApi.ts` (accept-terms, updateNickname).
**Depends on:** 0.3.

**Interface produced:** `meApi.acceptTerms()`, `meApi.updateNickname(nickname)` (422 → `ValidationError`).

- [ ] **Step 1:** `TermsPage` → `POST /api/me/accept-terms`; `ProfilePage` нік → `PUT /api/me`; помилку 422 показати у `NicknameField`.
- [ ] **Step 2:** приховати секцію топ-гравців у профілі за прапором (коментар «повернути після формули»); прибрати мок `mocks/profile.ts` лідерборду.
- [ ] **Step 3:** провести `tz` з `useAuth` у компоненти дат → `formatInTz` (картки, Timer, Details).
- [ ] **Step 4 (verify):** Playwright: онбординг проходить (terms→nickname); дати рендеряться у TZ (перемкнути системний TZ або передати інший — час зсувається).

---

## Self-Review (виконано автором плану)

- **Spec coverage:** http/dto/units→0.1; mappers/phase/result→0.2; auth/dev-login→0.3+B.1; tickets-pagination→B.2; realtime/zustand→F1; lists+infinite→F2; game live+bets infinite→F3; transactions→F4; onboarding/profile/hide-leaderboard/timezone→F5. Swagger→B.1/B.2. Усі секції спеки покриті.
- **Placeholder scan:** немає TBD; інтерфейси задано сигнатурами; повні реалізації — за референсами старого фронту (вказано шляхи).
- **Type consistency:** `GameDto/TicketDto/UserDto` визначені в 0.1 і використані всюди; `derivePhase/deriveResultState/toGameCard/toGameDetail/toBet` — 0.2 і споживаються F2/F3; `connectRealtime/joinGame/leaveGame` — F1 і F3.

## Порядок виконання (оркестрація)

1. **0.1 → 0.2** (foundation, я валідую).
2. Паралельно: **B.1+B.2** (бекенд-агент) і **0.3** (фронт-auth, проти контракту B.1).
3. **F1** (після 0.2).
4. Паралельно після F1/0.3/B.*: **F2**, **F3**, **F4**, **F5** (різні теки, спільні файли read-only).
5. Інтеграційний наскрізний тест (testnet + БД + 2 вкладки).

Кожна задача — окремий субагент у git-worktree; gate валідації (tsc + Playwright/curl + читання діфу) перед мерджем у `main`.
