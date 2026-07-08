# Раунд 13B — звіт

Статус: **ГОТОВО** (B2–B6 верифіковано в Playwright/юніт-тестах; B1 реалізовано і верифіковано механізм навігації ізольованими тестами + частковим живим прогоном — див. concerns щодо повного E2E оплати).

## Список змінених файлів

### frontend-1.0 (моя зона)
- `src/hooks/useTelegramBackButton.ts` — узагальнено «маршрути з власним обробником» (`/buy` → також `/game/:id`); дефолтний хендлер тепер використовує `goBackOrFallback`.
- `src/pages/GamePage.tsx` — власний `useTelegramBackButton(handleGameBack)`: якщо є заброньовані неоплачені ціни — питає підтвердження (`confirmViaTelegram`), інакше одразу `goBackOrFallback(navigate, '/')`.
- `src/pages/CreateGamePage.tsx` — навігація після створення гри тепер `{ replace: true }` (прибирає `/create-game` з історії).
- `src/hooks/useBuyTicketsFlow.ts` — `leaveToGame`/`confirmUncompleted` використовують `goBackOrFallback` замість `navigate(route)` (push).
- `src/context/BookedCartProvider.tsx` — підключено `useTelegramClosingConfirmation(prices.length > 0)`.
- `src/utils/navigation.ts` **(новий)** — `goBackOrFallback(navigate, fallback)`: крок назад в історії, якщо є куди, інакше replace на fallback.
- `src/utils/telegramPopup.ts` **(новий)** — `confirmViaTelegram(message)`: нативний `popup.show` (OK/Cancel), фолбек `window.confirm` поза Telegram.
- `src/hooks/useTelegramClosingConfirmation.ts` **(новий)** — `closingBehavior.enableConfirmation()/disableConfirmation()` за прапорцем `active`.
- `src/components/games/GameHeader.tsx` — B2: дата (біла, зверху) / таймер (сірий, знизу) у плашці; B3: назва гри `18px → 15px`; B4: `items-start → items-stretch` на хедері, прибрано `top-[14px]` з плашки — тепер тягнеться на всю висоту ряду.
- `src/utils/price.ts` — B5: `sanitizePriceInput` тепер нормалізує кому в крапку перед санітизацією (той самий підхід, що й `TicketPriceField` після раунду 11B).
- `index.html` — B6: `maximum-scale=1.0, user-scalable=no` у viewport meta (один тег, без дублювання).

### backend (без коміту, лише новий ключ у сидері)
- `backend/src/i18n/translations.seed.ts` — додано `game.leaveConfirmMessage` (en/uk/ru). Прогнав `npm run seed:i18n` локально (idempotent, вставив лише відсутній ключ) — переклад підтягується з БД дев-бекенду.

## tsc / build / lint
`npx tsc -b` та `npm run build` падають виключно на `src/components/games/chart/PriceChart.tsx` (3 помилки типів, WIP паралельного агента A — не мій код, я цей файл не чіпав). Ізольовано: `npx vite build` (без gate `tsc -b`) зібрав усі 666 модулів без помилок — мої зміни структурно коректні. `npx eslint .` — 8 errors / 0 warnings, ідентично базлайну з брифа (перевірив рядок-у-рядок: жодної нової помилки в змінених мною файлах; `BookedCartProvider.tsx` вже мав fast-refresh-помилку до мого редагування — я лише додав рядки нижче наявного `useBookedCart` export).

## Механізм B1 (одним реченням)
Зациклення виникало через `push`-навігацію на «точках неповернення» (створення гри, вихід з /buy) — стек накопичував мертві проміжні екрани (`/create-game`, `/buy`), тож Back ходив по колу; фікс — `replace`/крок-назад-в-історії (`goBackOrFallback`) на цих точках плюс власний детермінований хендлер Back на GamePage (із підтвердженням через Telegram-попап при незавершеному кошику) та `closingBehavior.enableConfirmation()` під час незавершеного флоу.

## Верифікація

**B2/B3/B4** — Playwright 390×844, живий дев-сервер (порт 3124), реальна гра з дев-бекенду. Скріншот підтверджує: дата «9 лип., 02:00» (біла, зверху) / таймер «01:5x:xx» (сірий, знизу); назва гри помітно менша (15px). Для B4 підмінив текст `<h1>` на довгий рядок (3 рядки) через DOM-мутацію (чистий layout-тест, без зміни даних) — плашка таймера/дати розтягнулась на всю висоту ряду й лишилась притиснутою знизу без відриву.

**B5** — ізольований юніт-тест `sanitizePriceInput` (Node, без браузера — dev-браузер MCP був нестабільний, див. concern нижче):
`"123456.78" → "123456.78"`, `"123456,78" → "123456.78"`, проміжні стани (`"1."`, `",5"`) також коректні. Додатково підтвердив живим вводом у реальний `PriceInput` на сторінці гри (Playwright, посимвольний ввід через `pressSequentially`): ввід `123456,78` дав значення поля `123456.78`.

**B6** — `document.querySelectorAll('meta[name="viewport"]')` на живій сторінці повернув рівно один тег із `content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"`.

**B1** — `goBackOrFallback` перевірено ізольованим Node-тестом (мокнутий `window.history`): при `idx=0` → `navigate('/', {replace:true})`; при `idx>0` → `navigate(-1)`. Живий прогін: з лобі → гра → бронювання ціни (без гаманця, чиста дія кошика) → «Купити квитки» (push на `/buy`) пройшов без помилок у консолі. Три локалі (`en-US`/`uk-UA`/`ru-RU`) для формату дати (кома, не «at») перевірені окремо `Intl.DateTimeFormat` у Node — всі три вже давали кому (це не потребувало зміни `formatInTz`, лише порядок/кольори в `GameHeader`).

## Concerns
1. **Спільний Playwright-браузер**: сесія MCP активно ділилась із паралельними агентами (A на порту 3123) — вкладки кількаразово перехоплювались чужою навігацією просто під час моїх викликів (URL змінювався між command'ами). Через це повний живий прогін «створив гру → Back → Back» та «оплатив → success → Back» **не був доведений до кінця в реальному браузері** (створення гри й оплата квитків потребують підключеного TonConnect-гаманця, що неможливо автоматизувати без mock-гаманця, а живий кошик-тест перервався зміною фази гри під час тестування). Компенсував ізольованими Node-юніт-тестами точної логіки (`goBackOrFallback`) та ретельним трасуванням стеку історії по коду для обох сценаріїв (a)/(б) з брифа — впевнений у коректності, але рекомендую оркестратору один ручний прогін у реальному Telegram-клієнті перед релізом.
2. **`backButton`/`closingBehavior` неможливо перевірити в dev-браузері**: `@telegram-apps/sdk`-виклики (`backButton.mount()`, `popup.show`, `closingBehavior.mount()`) кидають виняток поза Telegram-оточенням і безпечно виходять (try/catch) — тобто нативна кнопка «назад» і попап підтвердження в принципі не рендеряться в Chromium/Playwright. Верифікував лише фолбек-гілку (`window.confirm`) логічно за кодом і базову навігаційну механіку через `goBackOrFallback`. Реальна поведінка нативної кнопки Telegram — тільки в справжньому Telegram-клієнті.
3. Патерн «глобальний хук ховає кнопку на маршрутах з `customHandler`, локальний хук показує і чіпляє свій обробник» (тепер застосований і до `/game/:id`, за зразком уже наявного `/buy`) теоретично залежить від порядку виконання React-ефектів «дитина раніше за батька» в одному коміті — це вже існуючий патерн з `/buy` (не новий ризик), але я не зміг емпірично підтвердити відсутність гонки в реальному Telegram WebView.
