# Amplitude (Analytics + Session Replay) — звіт

Статус: **ГОТОВО**.

## Що зроблено

1. `npm install @amplitude/unified` (1.1.24).
2. `src/config/env.ts` — додано `amplitudeApiKey: string | null`
   (`VITE_AMPLITUDE_API_KEY`, порожньо/undefined → `null`). `.env` отримав
   реальний ключ (`3654a9d3c72de8e77fe9cc5ff9e1f6d8`), `.env.example` —
   порожнє значення. `.env` у `.gitignore` — ключ не потрапить у git.
3. Новий сервіс `src/services/analytics.ts` — єдина точка роботи з
   Amplitude:
   - `initAnalytics()` — module-level guard (`initStarted`), безпечний до
     StrictMode подвійного mount; `typeof window === 'undefined'` guard;
     без `env.amplitudeApiKey` → `disabled = true` НАЗАВЖДИ, `import(...)`
     жодного разу не викликається. З ключем — `const amplitude = await
     import('@amplitude/unified')` → `amplitude.initAll(key, { serverZone:
     'EU', analytics: { autocapture: true }, sessionReplay: { sampleRate:
     1 } })`.
   - `trackEvent(name, props?)` — до `ready` події складаються в буфер
     (`eventBuffer`), флашаться одразу після init; super properties
     підмішуються в момент реальної відправки (`sendEvent`), не в момент
     буферизації — щоб пізніше оновлення мови встигало підхопитись.
   - `identifyPlayer(user)` — `setUserId` + `Identify` (`nickname`,
     `language`, `tg_user_id` з `token-storage.getStoredTgUserId()`). До
     `ready` — запам'ятовує лише ОСТАННІЙ виклик (`pendingIdentify`),
     застосовує після init.
   - `resetAnalytics()` — `amplitude.reset()`, викликається в
     `AuthProvider` у точці повного wipe сесії (зміна tg-акаунта).
   - `setSuperProperty(key, value)` — сеттер module-level об'єкта
     `superProperties` (`app_language`, `platform`, `app_env`).
   - Усі виклики SDK — у `try/catch`, ніде немає `await` у бізнес-логіці
     компонентів (виклики `trackEvent`/`identifyPlayer`/`resetAnalytics`
     синхронні "fire-and-forget", реальна async-робота захована всередині
     сервісу).
   - `platform` визначається один раз при завантаженні модуля через
     `retrieveLaunchParams()` з `@telegram-apps/sdk` (той самий
     try/catch-патерн, що вже використовується в `AuthProvider`/
     `I18nProvider`) — `'telegram-webapp'` всередині Telegram, інакше
     `'browser'`.

## Де повішені події

| Подія | Файл | Місце | Props |
|---|---|---|---|
| `app_opened` | `src/app/App.tsx` | `useEffect` в корені (з ref-guard проти StrictMode double-mount), поруч з `initAnalytics()` | — |
| `player_authorized` | `src/context/AuthProvider.tsx` → `applyAuthResponse` | після `setUser(dto.user)` + `connectRealtime` — разом з `identifyPlayer(dto.user)` | — |
| (identify без події) | `src/context/AuthProvider.tsx` → `initializeAuth`, спроба 1 (access-токен) і спроба 2 (refresh-токен) | `identifyPlayer(currentUser)` в обох success-гілках відновлення сесії — БЕЗ `player_authorized` (це не нова авторизація) | — |
| `game_viewed` | `src/pages/GamePage.tsx` | `useEffect([id])` — один раз на зміну `id`, не на кожен ре-рендер | `{ game_id }` |
| `bet_placed` | `src/hooks/useBuyTicketsFlow.ts` → `payCurrentCheck` | одразу після успішного `createTickets` (усередині циклу по `group`) | `{ game_id, tickets_count, amount_gram }` |
| `game_create_started` | `src/pages/CreateGamePage.tsx` | `useEffect([])` на mount, з ref-guard проти StrictMode | — |
| `game_created` | `src/pages/CreateGamePage.tsx` → `handlePay` | одразу після успішного `createGame(...)`, до навігації | `{ game_id: gameResp.id }` |

`resetAnalytics()` — `src/context/AuthProvider.tsx`, у гілці інваріанта
зміни tg-акаунта (поруч з `clearTokens`/`useLiveStore.resetSession`).

Super property `app_language` синхронізується в `src/i18n/I18nProvider.tsx`
через `useEffect([lang])` — покриває і початкове визначення мови, і
подальші перемикання через `setLang`.

## Вибір по `bet_placed`: чанк, не ордер

У наявному коді `payCurrentCheck` (useBuyTicketsFlow.ts) кожен "чек" уже
розбитий на групи по `CHUNK_SIZE` (8) цін ще на етапі `useTicketChecks`;
цикл `for (const group of groups)` виконує послідовно
`prepareTicketTx → sendTransaction → createTickets` для кожної групи. Один
успішний `createTickets` = одна реально підтверджена БЕКЕНДОМ покупка
частини ставок. Трекати "по чанку" природно лягає в наявний код без
додаткової агрегації через увесь ордер (яка потребувала б окремого
акумулятора поза цим циклом і ризикувала б неправильно порахувати
частково зафейлений ордер). Якщо `activePrices.length ≤ CHUNK_SIZE`
(типовий випадок — один чек = один чанк), подія фактично одна на чек,
тобто узгоджується і з "по одній події на успішний чанк", і з очікуваннями
для звичайного флоу.

## Обмеження, дотримані повністю

- Прямий імпорт `@amplitude/unified` — лише в `src/services/analytics.ts`
  (перевірено `grep -rn "@amplitude" src`).
- Жодних токенів/секретів у properties — identify бере лише `nickname`,
  `language`, `tg_user_id` (публічний ідентифікатор з token-storage, не
  сам токен).
- Серверні/бекендові події зі спеки — поза скоупом, backend не чіпався.

## tsc / build / lint

`npx tsc -b` — 0 помилок · `npm run build` — успішно (916 modules,
той самий передіснуючий CSS-warning) · `npx eslint .` (== `npm run lint`)
— **7 errors / 0 warnings, точний базлайн до змін** (заміряно окремо ДО
початку роботи; один новий warning від `useBuyTicketsFlow.ts`
(`react-hooks/exhaustive-deps`, бракувало `ticketPrice` в deps
`payCurrentCheck`) — виправлено додаванням залежності, тож фінальний lint
= базлайн один-в-один).

## Підтвердження: SDK в окремому lazy-чанку

Build-вивід (`npm run build`) містить окремі чанки, які збираються лише з
графа модулів `@amplitude/unified` та його піддепенденсі
(`@amplitude/analytics-browser`, `@amplitude/plugin-session-replay-browser`
→ `rrweb`):

```
dist/assets/global-scope-CUXPqQmp.js                               0.27 kB
dist/assets/observers-exK2iaIt.js                                  2.45 kB
dist/assets/tslib.es6-dLEka7Zl.js                                  3.28 kB
dist/assets/build-CdbSE3_O.js                                      3.32 kB
dist/assets/worker-Dwz1lY3J.js                                     8.60 kB
dist/assets/esm-DLdjMdds.js                                       22.15 kB
dist/assets/rrweb-plugin-console-record-BLt7_tfP.js              123.80 kB
dist/assets/rrweb-record-BEIH1NW6.js                             179.75 kB
dist/assets/esm-Cpu_b5Lc.js                                      407.24 kB
dist/assets/index-DjnCZmOh.js                                  1,065.68 kB   ← головний бандл
```

Перевірено `grep`-ом, що ці чанки НЕ входять у головний бандл
(`index-DjnCZmOh.js`) — там лише один рядок згадки "amplitude" (ключ
конфіга `amplitudeApiKey` + рядки `console.warn`), а сам виклик
`await import('@amplitude/unified')` присутній у коді як
`__vite__mapDeps`-обгорнутий динамічний імпорт (класичний
Vite-код-спліттінг патерн), НЕ статичний `require`/`import`.
`dist/index.html` не містить `<link rel="modulepreload">` на ці чанки —
браузер не завантажує їх заздалегідь.

Додатково перевірено сценарій "без ключа": окрема збірка з
`VITE_AMPLITUDE_API_KEY=` дала в головному чанку `amplitudeApiKey:null`;
`initAnalytics()` у цьому випадку виставляє `disabled=true` ДО рядка з
`import(...)`, тож сам виклик `import()` ніколи не виконується — у runtime
запиту за файлом amplitude-чанка не буде взагалі (чанк лишається білдовим
артефактом на диску, як і будь-який `import()`-спліт, але HTTP-запит за
ним відбувається лише за фактичного виклику `initAnalytics()` з непорожнім
ключем).

## Файли

- `src/services/analytics.ts` — новий, єдина точка роботи з Amplitude
- `src/config/env.ts` — `amplitudeApiKey`
- `.env`, `.env.example` — `VITE_AMPLITUDE_API_KEY`
- `src/app/App.tsx` — `initAnalytics()` + `app_opened`
- `src/context/AuthProvider.tsx` — `identifyPlayer`/`trackEvent('player_authorized')`/`resetAnalytics`
- `src/i18n/I18nProvider.tsx` — `setSuperProperty('app_language', lang)`
- `src/pages/GamePage.tsx` — `game_viewed`
- `src/pages/CreateGamePage.tsx` — `game_create_started`, `game_created`
- `src/hooks/useBuyTicketsFlow.ts` — `bet_placed`
- `package.json` / `package-lock.json` — залежність `@amplitude/unified`

## Concerns

1. Дублювання `app_opened`/`game_create_started` у StrictMode dev-режимі
   закрито ref-guard'ами (той самий патерн, що вже є в `AuthProvider`
   (`initStartedRef`)) — у продакшн-білді StrictMode подвійний mount не
   відбувається взагалі, тож це суто dev-зручність, а не production-фікс.
2. `identifyPlayer` під час відновлення сесії (спроби 1/2) викликається
   БЕЗ буферизації на рівні AuthProvider — якщо `initAnalytics()` ще не
   встиг завершитись (мережевий `initAll`), сервіс сам це відкладає через
   `pendingIdentify` (запам'ятовує лише останній виклик), тож дублікатів
   чи втрат немає, але це неявна поведінка сервісу, варта уваги при
   майбутньому рефакторингу analytics.ts.
3. `amount_gram` для `bet_placed` рахується як `Number(ticketPrice) *
   group.length` на фронтенді (ціна за квиток із `GameDetail`/live-стору),
   а не бекендовою сумою транзакції — узгоджується зі спекою ("client-side
   only"), але якщо колись знадобиться звірка з реальною сумою
   nanoTON-транзакції, треба explicit backend-подію (поза скоупом брифу).
