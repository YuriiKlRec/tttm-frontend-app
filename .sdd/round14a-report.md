# Раунд 14A — звіт

Статус: **ГОТОВО**.

## 1. Плашка дата/таймер відірвана від лінії знизу

**Причина** (підтверджено вимірами `getBoundingClientRect` у живому браузері): `<header>` мав
`pb-3` (12px) НА САМОМУ flex-контейнері. При `items-stretch` обидва flex-item'и (лівий стовпець
і плашка дата/таймер) стретчаться до **content-box** висоти контейнера — тобто до межі
`padding-bottom`, а не до справжнього нижнього краю `<header>`. Через це рамка плашки завжди
(на БУДЬ-ЯКІЙ висоті ряду — коротка чи довга назва) закінчувалась на 12px раніше, ніж
`<header>` реально завершувався (=там, де починається `<main>`/графік) — рівно розмір
`pb-3`. Виміряно до фікса: `header.bottom = 87.5`, `box.bottom = 75.5` (розрив 12px) для
короткої назви; аналогічний розрив на довгій.

**Фікс** — `src/components/games/GameHeader.tsx`: `pb-3` прибрано з `<header>` і перенесено
на ЛІВИЙ стовпець (`div` з назвою + ViewSelector), так візуальний відступ під назвою лишився
той самий, а плашка справа (без власного бекграунду для padding) тепер стретчиться на всю
СПРАВЖНЮ висоту ряду й впритул торкається межі, де закінчується `<header>` і починається
контент під ним — на будь-якій висоті (коротка/довга назва, 1–5 рядків), у завершеній грі теж.

**Верифікація** (Playwright 390×844, стаб `page.route('**/api/games/:id')`, ізольована сторінка
через `page.context().newPage()` через спільний з паралельним агентом браузер):
- Коротка назва: `box.bottom = header.bottom = main.top = 83.5` (0px розрив) — до фікса було
  `75.5` vs `87.5` (12px розрив).
- Довга назва (5 рядків): `box.bottom = header.bottom = main.top = 173.5` — 0px на будь-якій
  висоті.
- Завершена гра (2-рядкова назва, плашка дата+фінальна ціна): те саме, 0px.
- 3 локалі (en/uk/ru), довга назва: `gapZero: true` в усіх трьох.
- Скріншоти до/після (короткий і довгий заголовок): `.playwright-mcp/round14a/before-long-name.png`
  (видно розрив між рамкою плашки й верхом графіка) vs `after-short-name.png` /
  `after-long-name.png` (плашка впритул до графіка, без розриву) — усі в
  `/Users/yuriikl/Code/its/Reack-and-Next/tttm/.playwright-mcp/round14a/`.

## 2. GRAM замість TON у видимих сумах

Пройшов увесь код (`grep 'TON'` по tsx/ts, виключаючи `chart/*`) і backend
`translations.seed.ts` (жодного i18n-ключа зі словом TON у ЗНАЧЕННІ — суфікс валюти всюди
дописується в коді, не в перекладі, тож **i18n-ключі міняти не довелось**).

### Таблиця «було → стало»

| Файл | Було | Стало | Де видно |
|---|---|---|---|
| `src/utils/price.ts` (`totalTon`) | `` `${...} TON` `` | `` `${...} GRAM` `` | Кошик (CartPanel сума), BetPanel «Booked: N \| X GRAM», TicketCheck «Pay» на /buy |
| `src/components/games/BetPanel.tsx:103` | `= {ticketPrice} TON` | `= {ticketPrice} GRAM` | Підвал гри, ціна квитка (порожній кошик) |
| `src/components/buy/TicketRow.tsx:10` (`ROW_TON`) | `'0.1 TON'` | `'0.1 GRAM'` | Рядок чека на /buy (мітка ціни квитка) |
| `src/pages/GamePage.tsx:121` (`detailWinnersShare`) | `` `${winnerShare...} TON` `` | `` `${winnerShare...} GRAM` `` | Details → «Частка переможця» |
| `src/pages/GamePage.tsx:122` (`detailOrganizersShare`) | `` `${organizerShare...} TON` `` | `` `${organizerShare...} GRAM` `` | Details → «Частка організатора» |
| `src/pages/GamePage.tsx:129` (`detailTicketPrice`) | `` `${game.ticketPrice} TON` `` | `` `${game.ticketPrice} GRAM` `` | Details → «Ціна квитка» |
| `src/services/mappers.ts:121` (`toGameDetail.prize`) | `` `${nanoToTon(...)} TON` `` | `` `${nanoToTon(...)} GRAM` `` | Predictions stats «Нагорода», Details «Нагорода», графік — плашка виграшного пулу (winningPool, лише читає готовий рядок — chart/* не чіпав) |
| `src/services/mappers.ts:222` (`toResultCard.reward`) | `` `${nanoToTon(...)} TON` `` | `` `${nanoToTon(...)} GRAM` `` | Екран Results (ResultCard, велика сума під трофеєм) |
| `src/services/mappers.ts:364` (`toWaitCard.reward`) | `` `${nanoToTon(...)} TON` `` | `` `${nanoToTon(...)} GRAM` `` | Екран Waiting (WaitCard, кільце з таймером) |

Плюс оновлено 7 JSDoc-коментарів з прикладами «2.4 TON» → «2.4 GRAM» (не впливають на UI, лише
на точність документації в коді): `types/wait.ts`, `types/game.ts:89`, `types/results.ts`,
`components/games/GameContent.tsx`, `components/games/PredictionStats.tsx`,
`components/games/ResultCard.tsx`, `components/buy/TicketRow.tsx`.

Місця, де GRAM УЖЕ був до цього раунду (не чіпав, перевірив що досі коректно):
`GameCard.tsx` (лобі-картка, `formatAmount`), `TicketPriceField.tsx` (create-game, i18n-ключ
`createGame.gramSuffix`), `toProfile` у `mappers.ts` (профіль/історія ігор, вже мав
`${nanoToTon(...)} GRAM`).

### Свідомо залишені TON/nanoTON-місця (не відображення суми ставки/призу)
- **TonConnect UI** (`WalletButton.tsx` та ін.) — кнопка гаманця/адреса рендериться самою
  бібліотекою `@tonconnect/ui-react`, не нашим текстом.
- `config/env.ts` — `VITE_TON_NETWORK` (mainnet/testnet), технічний конфіг мережі.
- `utils/explorer.ts`, `ResultCard.tsx:26` — `TON-explorer` (URL на `tonviewer.com`), посилання
  на блокчейн-експлорер контракту.
- `utils/prizePool.ts` — `CREATION_FEE_TON = 0.2`: реальна одноразова комісія за деплой
  контракту в мережі TON (сплачується справжніми TON, не GRAM); на екрані `/create-game`
  показується лише як текст без суми («Потрібна одноразова плата за створення») — цифра
  ніде не відображається, міняти нічого.
- `nanoTON`-коментарі та назви (`ticketAmount`, `NANO_PER_TON`, `payTon`, `totalTon`,
  `ROW_TON`) — внутрішні змінні/типи, які представляють ту саму суму, що й GRAM на екрані
  (GRAM — це лише назва відображення тієї ж on-chain величини nanoTON, без реальної конвертації
  курсу); брифом явно заборонено перейменовувати змінні/типи, тому лишив як є.
- `gameApi.ts`, `ticketApi.ts` — коментарі про підготовку/збереження «TON-транзакції» (реальна
  блокчейн-транзакція TonConnect).

## Верифікація п.2 (Playwright 390×844, реальний dev-бекенд, dev-bypass auth)
Пройшов усі вказані в брифі екрани, шукав `/\bTON\b/` у `body.innerText()`:
- Гра (BetPanel, `= 0.1 GRAM`) — **0 TON**.
- Кошик / /buy (Заброньовано, Всього, До сплати — `0.1 GRAM`) — **0 TON**.
- Details (Нагорода/Частка переможця/організатора/Ціна квитка — усі GRAM) — **0 TON**.
- Results (реальні дані dev-бекенду, 10 ігор: `0.1 GRAM`…`1 GRAM`, `0 GRAM`) — **0 TON**.
- Profile (Нагороди, історія ігор — GRAM) — **0 TON**.
- Create-game (Ціна квитка — GRAM-суфікс) — **0 TON**.
- 3 локалі (en/uk/ru) на екрані гри — **0 TON** у кожній.

Скріншоти: `.playwright-mcp/round14a/{buy-page,details-view,results-page,profile-page,
create-game,locale-en}.png`.

## Список змінених файлів

### frontend-1.0
- `src/components/games/GameHeader.tsx` — п.1: `pb-3` перенесено з `<header>` на лівий стовпець.
- `src/utils/price.ts` — п.2: `totalTon` → GRAM.
- `src/components/games/BetPanel.tsx` — п.2: `= {ticketPrice} GRAM`.
- `src/components/buy/TicketRow.tsx` — п.2: `ROW_TON` → GRAM (+ коментар).
- `src/pages/GamePage.tsx` — п.2: 3 місця в `buildDetailGroups` → GRAM.
- `src/services/mappers.ts` — п.2: `toGameDetail`, `toResultCard`, `toWaitCard` → GRAM.
- `src/types/wait.ts`, `src/types/game.ts`, `src/types/results.ts`,
  `src/components/games/GameContent.tsx`, `src/components/games/PredictionStats.tsx`,
  `src/components/games/ResultCard.tsx` — лише JSDoc-приклади «2.4 TON» → «2.4 GRAM» (без зміни
  логіки/UI).

### backend
Змін немає. У `backend/src/i18n/translations.seed.ts` жодного ключа зі словом TON у ЗНАЧЕННІ не
знайдено — усі суфікси валюти дописуються у фронтенд-коді, не в перекладах. Сидер не чіпав,
БД оновлювати не треба.

## tsc / build / lint
`npx tsc -b` — чисто (0 помилок). `npx vite build` — 666 модулів, успішно. `npx eslint .` — 12
помилок у репо (базлайн р.13 був 7; зростання — у файлах ПОЗА моєю зоною, паралельний агент:
`chart/PriceChart.tsx`, `layout/AppLayout.tsx`, `context/AuthProvider.tsx`,
`context/BookedCartProvider.tsx`, `hooks/useInfiniteGames.ts`, `buy/ConfettiBurst.tsx`).
Таргетований прогін лише на моїх змінених файлах (`GameHeader.tsx`, `BetPanel.tsx`,
`TicketRow.tsx`, `GamePage.tsx`, `mappers.ts`, `price.ts`, `units.ts`, `CartPanel.tsx`,
`useTicketChecks.ts`, `ResultCard.tsx`, `GameContent.tsx`, `PredictionStats.tsx`, типи) —
**0 помилок**.

## Concerns
1. **Спільний Playwright-браузер із паралельним агентом (round14b, порт 3127)**: за
   замовчуванням `page` в MCP-сесії кілька разів перехоплювався чужою навігацією просто під час
   виконання. Обійшов створенням ІЗОЛЬОВАНОЇ вкладки на кожен прогін
   (`page.context().newPage()` всередині одного `browser_run_code_unsafe`-виклику — стаб,
   навігація, вимірювання і скріншот в одному замкнутому скрипті, без залежності від «поточної»
   вкладки) — усі наведені в звіті цифри й скріншоти отримані саме так, надійно.
2. **Ідентифікація «лінії» з брифу**: у коді немає окремого DOM/canvas-елемента, підписаного як
   «вертикальна лінія» біля хедера (`chart/*` малює власні вертикальні пунктири на canvas, але
   вони не привʼязані до позиції плашки і поза моєю зоною). Трактував «лінію знизу» як межу, де
   реально закінчується `<header>` і починається контент під ним (`<main>`) — саме там раніше
   був стабільний 12px розрив незалежно від висоти назви; фікс прибирає цей розрив повністю
   (виміряно точно 0px до пікселя в 3 сценаріях × 3 локалі). Якщо малось на увазі щось інше
   (напр. конкретний елемент з Figma-макета) — потрібен номер вузла для звірки.
3. Оплату на `/buy` до кінця (реальний TonConnect-гаманець) не проходив — перевірив лише
   pre-wallet стан чека («Заброньовані прогнози… До сплати: 0.1 GRAM»), що покриває весь текст
   валюти на цьому екрані; сама оплата виходить за межі зміни (не стосується відображення суми).
