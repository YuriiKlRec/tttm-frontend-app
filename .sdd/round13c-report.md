# Раунд 13C — звіт

Статус: **ГОТОВО**. Безпековий баг усунуто, доведено 3 сценаріями в Playwright (стаб
`window.Telegram` через URL-launch-params + `page.route` на порту 3125). Dev-режим без
Telegram не зачеплений.

## Механізм бага (одним реченням)

`AuthProvider` при старті довіряв будь-якому валідному `accessToken`/`refreshToken` з
localStorage без перевірки, якому Telegram-акаунту він належить — а оскільки localStorage
Telegram WebView спільний для всіх акаунтів на пристрої, після перемикання акаунта апка
підхоплювала сесію ПОПЕРЕДНЬОГО користувача замість того, щоб авторизувати нового по
свіжому `initData`.

## Фікс

Інваріант: **сесія завжди належить актуальному tg-користувачу з initData**. Реалізовано
через окремий ключ `tgUserId` у localStorage (JWT несе БД-id, не tg id — порівнювати
токен нема з чим без окремого маркера).

При кожному старті `AuthProvider.initializeAuth()`:
1. Читає `user.id` зі СВІЖОГО `retrieveLaunchParams()` (не з кешу).
2. Якщо є Telegram-контекст І є збережена сесія (токени) — звіряє з `tgUserId`, збереженим
   під час останнього логіну через initData.
3. Розбіжність **або відсутність маркера** (legacy-сесія до цього фікса) → повне очищення:
   `clearTokens()` + `clearTgUserId()` + `setToken(null)` + `disconnectRealtime()` +
   `useLiveStore.getState().resetSession()` (нове: скидає `games`/`ticketsByGame`/
   `myConfirmedTicketsByGame`/`myUserId`/`myNickname`/`socketConnected` — щоб live-кеші
   попереднього юзера не протекли в сесію нового) — і одразу повна реавторизація по
   свіжому initData (минаючи спроби 1/2 зі старими токенами). Бекенд поверне
   `termsAccepted=false` для нового користувача → `OnboardingGate` сам веде на `/welcome`.
4. Якщо Telegram-контексту немає (dev/браузер) — перевірка інваріанта повністю
   пропускається, поведінка ідентична попередній (dev-bypass не зачеплений).
5. `tgUserId` записується в localStorage одразу після успішного `POST /api/me/auth`
   (у `login()`), окремо для кожного логіну через initData.

## Список змінених файлів

- `src/context/AuthProvider.tsx` — інваріант-перевірка на старті (крок 0 у mount-флоу),
  `readTelegramUserId()`, запис `tgUserId` у `login()`.
- `src/services/token-storage.ts` — новий ключ `tgUserId` + `storeTgUserId`/
  `getStoredTgUserId`/`clearTgUserId`.
- `src/store/liveStore.ts` — новий action `resetSession()` (скидання live-кешів
  попереднього користувача при зміні акаунта).

Backend НЕ редагувався (поза зоною).

## Верифікація (Playwright, порт 3125)

Плейн Node-скрипт на `playwright` (без `@playwright/test` — пакет не в
`package.json`, ставити не став, щоб не чіпати спільний `package.json` паралельних
агентів; playwright встановлено окремо в scratchpad, репозиторій не зачеплений). Емуляція
Telegram — URL launch-params (`#tgWebAppData=...`, як реальний лаунч-лінк) +
`window.TelegramWebviewProxy` стаб (bridge поза iframe інакше кидає `UnknownEnvError`).
`page.route('**/api/**')` стабить `/api/me/auth`, `/api/me`, `/api/me/dev-login`, i18n,
`/api/games`.

1. **Перемикання акаунта A→B** (той самий контекст/localStorage, юзер відкриває гру по
   лінку під новим tg-акаунтом): після перемикання — рівно 1 новий `POST /api/me/auth` зі
   свіжим `initData` user.id=2002 (не переюзано A), `accessToken` змінився з `access-A` на
   `access-B`, жоден `GET /api/me` не поніс старий `access-A`, редирект на `/welcome`
   (B — новий, `termsAccepted=false`). **PASS**.
2. **Регресія (а):** той самий юзер A, справжній relaunch (нова сторінка в тому ж
   контексті, той самий localStorage) — 0 нових `POST /api/me/auth`, сесія відновлена
   через `GET /api/me` (Спроба 1, по токену). **PASS**.
3. **Регресія (б):** dev-режим без жодної Telegram-емуляції — `POST /api/me/dev-login`
   відпрацював як раніше, `tgUserId` НЕ пишеться, `/api/me/auth` не викликається. **PASS**.

Прогнано двічі поспіль — стабільно.

## tsc / build / lint

`tsc -b` чисто, `npm run build` зелений; lint у моїх файлах (`AuthProvider.tsx`,
`token-storage.ts`, `liveStore.ts`) — 0 нових помилок (`token-storage.ts`/`liveStore.ts` —
чисто, `AuthProvider.tsx` має 1 передіснуючу `react-refresh/only-export-components` на
`useAuthContext`, ідентична базлайну). Загальний лічильник по репо коливається
(7–8) через паралельних агентів 13A/13B, що одночасно редагують `PriceChart.tsx`/
`ConfettiBurst.tsx` в тій самій робочій копії — підтверджено `git stash` порівнянням до
старту роботи: базлайн був рівно 8 помилок, той самий набір, жодної в моїй зоні.

## Рекомендація для бекенда (НЕ реалізовано, лише пропозиція)

`backend/src/controllers/me.controller.ts:94` формує JWT-payload як
`{ id: user.id, role: user.role }` (`generateTokens`, `backend/src/utils/jwtService.ts`) —
БД-id, без telegramId. Жоден ендпоінт (`/api/me`, refresh) не звіряє токен із поточним
Telegram-акаунтом — бекенд повністю довіряє підпису JWT. Пропозиція (defense-in-depth,
клієнтський фікс цього раунду закриває дірку на фронті, але не захищає від
модифікованого/чужого клієнта): додати клейм `tgId: user.telegramId` у payload
`generateTokens` у `me.controller.ts` (auth-хендлер), і в middleware, що перевіряє
Bearer-токен (`authMiddleware.ts`), опційно — якщо запит одночасно несе `X-Telegram-Init-Data`
або аналог — звіряти `tgId` з токена проти user.id з initData, 401 при розбіжності.

## Concerns

- `hash`/`signature` у Telegram initData на бекенді валідуються HMAC-підписом бота
  (`verifyTelegramAuth`) — не перевіряв тут (backend поза зоною), але фронтовий фікс не
  залежить від цього: інваріант порівнює tg user.id зі СВОЄЮ Ж раніше збереженою міткою,
  а не довіряє initData без верифікації бекендом (бекенд і так перевіряє підпис при
  кожному `POST /api/me/auth`).
- Legacy-сесії (токени, збережені ДО цього фікса, без `tgUserId`) трактуються як
  "невідома ідентичність" і форсують повну реавторизацію при першому запуску після
  деплою — навіть для того самого юзера. Одноразовий зайвий re-login на деплой,
  свідомий trade-off заради закриття дірки для вже потенційно постраждалих сесій.
- `liveStore.resetSession()` практично ніколи не встигає "протекти" видиме дублювання
  в UI, бо реальне перемикання акаунта завжди супроводжується новим page load
  (WebView відкривається заново по лінку/іконці) — Zustand-стор і так in-memory і
  скидається на fresh document. Виклик `resetSession()` — захист про запас для
  гіпотетичного edge-case без повного релоуду; не шкодить.
