# Раунд 8 — звіт

Джерело: Figma `sjYaf8Zax1vT2STG6pJPMd`, вузол `1360:10842` (картка гри в списку, вкладка
Predictions). Файли: `src/components/games/GameCard.tsx`, `src/components/games/Timer.tsx`,
`src/utils/units.ts`.

## Зміна 1 + 2 — Порядок дати/таймера і кругла підказка пари (`Timer.tsx`)

У Figma центр кільця для картки списку — це **три** блоки зверху вниз: іконка-монета (кругла,
`icon-btc.svg` — вже був у проєкті і збігається піксель-в-піксель із Figma-експортом) + текст пари
(16px bold, primary) → дата (22px bold, primary) → зворотній відлік (18px bold, secondary). Це
інша розкладка, ніж було: раніше час (28px, primary) стояв над датою (18px, secondary), пари не
було взагалі.

`Timer` — спільний компонент, його також використовує `WaitCard` (вкладка Waiting, з `reward`),
яку чіпати не можна. Додав необов'язковий проп `pair?: string`: коли він заданий (тільки з
`GameCard`), рендериться нова розкладка (пара → дата → час, gap 20/6px, розміри 16/22/18); гілка
`reward`/легасі (`WaitCard`) лишилась **байт-у-байт** незмінною. `GameCard` передає
`pair={PREDICTION_PAIR}` — константа `'BTC/USDT'` (як і решта проєкту: `CurrencyPricePlate.tsx`,
`PairDisplay.tsx` теж хардкодять пару; `Game.targetCurrency` типу в системі поки одна пара, тож
плюмбінг через мапер не додавав цінності — див. Concern нижче).

Іконка-підказка — статична (не інтерактивна): у Figma це просто лейбл-групa без кнопки/тултipу,
тож зроблено `img aria-hidden` + текст, без `role="button"`/`aria-label` (нема чого ховати —
текст пари вже видимий).

## Зміна 3 — TON → GRAM (`utils/units.ts`, `GameCard.tsx`)

Суфікс `TON` у картці був хардкоджений прямо в JSX (`{ticketPrice} TON`), не через жоден
formatter — `formatTon` у проєкті не існувало. Додав у `utils/units.ts` параметризовану
`formatAmount(value: string, unit: string = 'GRAM')`, використав у `GameCard` для ціни квитка й
призу. Інші місця з `TON` (`BetPanel.tsx`, `CartPanel.tsx`, `TicketRow.tsx`, `ResultCard.tsx`,
`PredictionStats.tsx`, `GameContent.tsx`) **не чіпав** — вони не ділять formatter з картками
списку і поза скоупом брифа.

## Зміна 4 — Відступи (`GameCard.tsx`)

Звірка з design context вузла показала одне реальне розходження: вертикальний padding картки був
`py-4` (16px), у Figma `py-[12px]` → виправлено на `py-3`. Другий нюанс — gap у блоці
заголовок/автор був `gap-[3px]`, у Figma `gap-[4px]` → виправлено. Решта відступів (`px-7`=28,
`gap-3`=12 між секціями, `gap-[9px]`/`gap-2` у рядку ціна/приз) вже збігалися з макетом.

## Зміна 5 — Індикатор кількості квитків (`GameCard.tsx`)

У Figma немає окремого рядка «You have N tickets» під кнопкою — замість нього кругла біла плашка
з числом накладена на іконку квитка (top-right), поруч ціни. `ticketsCount` уже було в `Game`
(рахує тікети поточного юзера в цій грі — `services/mappers.ts:81`), нову модель/мок не додавав.
Показую бейдж лише коли `ticketsCount > 0` (той самий патерн, що й бейдж лічильника вкладок у
`NavItem.tsx`). Бейдж `aria-hidden` (число саме по собі малоінформативне для скрінрідера), поруч —
`sr-only`-текст `t('game.youHaveTickets', { count })`, щоб інформація не губилась для a11y.
Переклад `game.youHaveTickets` лишається використаним і в `BetPanel.tsx` — не осиротів.

## Верифікація

**Playwright 390×844.** Мок-даних у фронтенді немає (переклади/список ігор ідуть з реального
dev-бекенду `dev.tttm.games`); усі 47 ігор на бекенді вже завершились (endTime у минулому) —
список Predictions був порожній. Для скріншот-звірки перехопив `page.route` на
`**/api/games?**isPredictions=true**` і повернув один валідний `GameDto` (той самий контракт, що
й реальний бекенд, з майбутнім `endTime`) — без змін коду, лише для перевірки в браузері.
Скріншот картки збігається з Figma-скріном вузла 1360:10842 (порядок пара→дата→час, кругла
іконка, GRAM, бейдж біля ціни).

Таблиця вимірів (`getBoundingClientRect`/`getComputedStyle` проти Figma design context):

| Елемент | Figma | Факт |
|---|---|---|
| Картка, ширина | 334px | 334px |
| Картка, padding | 28px / 12px (x/y) | 28px / 12px |
| Картка, gap між секціями | 12px | 12px |
| Заголовок/автор, gap | 4px | 4px |
| Timer, розмір | 200×200 | 200×200 |
| Пара → дата, gap | 20px | 20px |
| Дата → час, gap | 6px | 6px |
| Текст пари, розмір/колір | 16px bold, `#fff` | 16px/700, `rgb(255,255,255)` |
| Дата, розмір/колір | 22px bold, `#fff` | 22px/700, `rgb(255,255,255)` |
| Час, розмір/колір | 18px bold, `#adadad` | 18px/700, `rgb(173,173,173)` |
| Ряд ціна/приз, ширина | 270px | 270px |
| Іконка квитка → ціна, gap | 9px | 9px |
| Іконка призу → сума, gap | 8px | 8px |
| Бейдж квитків, висота | 12px | 12px |
| Бейдж, border-radius | 6px | 6px |
| Бейдж, bg/text | `#fff` / `#323232` | `rgb(255,255,255)` / `rgb(50,50,50)` |

Усі значення збігаються точно. Висота картки (334×381.5 факт проти 370 Figma) відрізняється на
~11px — очікувано: інша дата/довжина рядка з реального форматера (`8 лип., 22:35` довше за
Figma-приклад `Jan 1, 10:00`) і реальні метрики Anonymous Pro замість Figma-рендеру; layout-логіка
(gap/padding) ідентична.

**3 мови.** `localStorage['i18n.lang']` = `en`/`uk`/`ru` + reload: жодних обрізаних написів
(`scrollWidth > clientWidth` — 0 збігів на видимому тексті; єдиний хіт — навмисний `sr-only`-текст
бейджа, це не баг, а сам механізм sr-only). Картка: `Test 2 | @User_name | BTC/USDT | 8 лип.,
22:35 | 03:00:38 | = 0.1 GRAM | 0.2 GRAM | Зробити прогноз | 00:57:37` (uk) — і аналогічно в en/ru.

**Якість:** `npx tsc -b` — чисто. `npm run build` — успішно (попередження про розмір чанка —
існуюче, не пов'язане зі змінами). `npm run lint` — 8 errors/1 warning, ідентично базовому `main`
(жодного файлу зі списку помилок я не торкався).

## Concern

Пара `BTC/USDT` захардкоджена в `GameCard.tsx` (константа `PREDICTION_PAIR`), а не взята з
`dto.targetCurrency` — свідомий вибір: у всій системі зараз підтримується рівно одна пара
(`GameDto.targetCurrency: 'BTCUSDT'` — літеральний тип), і всі інші місця показу пари в проєкті
(`CurrencyPricePlate.tsx`, `PairDisplay.tsx`) роблять так само. Якщо бекенд колись додасть інші
пари — тоді має сенс прокинути `targetCurrency` через `Game`/`toGameCard` в усіх трьох місцях
одразу, а не лише тут.

## Коміти

1. `bf19700` — Reorder timer date/time and add pair hint to game card ring
2. `85d7a20` — Add GRAM amount formatter for game card prices
3. `181972e` — Align game card spacing, GRAM prices and ticket indicator
