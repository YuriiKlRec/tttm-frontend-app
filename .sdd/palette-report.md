# Оновлення палітри (grey/900–700) — звіт

Статус: **ГОТОВО**. `npx tsc -b` чисто, `npm run build` зелений, `npm run lint` — 7 err/0 warn (базлайн, жоден не в змінених файлах).

## Токени (`src/styles/index.css`, `@theme`)

| Токен | Було | Стало |
|---|---|---|
| `--color-background` | `#212121` | `#080603` |
| `--color-surface` | `#323232` | `#212121` |

`--color-surface-hover` **НЕ додано** — перевірив усі входження `#3F3F3F` (єдине місце: `PredictionButton.tsx`, `DISABLED_CLASS`/`DISABLED_SIDE`), це стан **disabled**, не hover. Реального hover-використання grey/700 у коді нема → YAGNI, токен не заводив. Значення все одно замінив по value-мапінгу (grey/700: `#3F3F3F → #323232`), лишив як inline-hex з коментарем, оскільки об'єктивної семантичної ролі-токена для нього нема.

## Таблиця замін

| Файл:рядок | Було | Роль | Що зробив |
|---|---|---|---|
| `src/styles/index.css:22-23` | `#212121` / `#323232` | background/surface токени | Значення оновлені на `#080603` / `#212121` |
| `src/components/ui/PredictionButton.tsx:27` | `text-[#323232]` | text/on-brand (текст на оранжевій primary-кнопці) | → `text-surface` (нове значення grey/800 = новий `--color-surface`) |
| `src/components/ui/PredictionButton.tsx:28` | `text-[#323232]` | text/on-brand (текст на білій inverse-кнопці) | → `text-surface` |
| `src/components/ui/PredictionButton.tsx:38,40` | `bg-[#3f3f3f]` (×2, DISABLED_CLASS/SIDE) | grey/700, disabled-стан (не hover) | → `bg-[#323232]` (hex, коментар пояснює чому без токена) |
| `src/components/layout/TopBar.tsx:16` | коментар «фон #212121» | документація (клас вже `bg-background`) | Текст коментаря → «фон #080603 (bg-background)» |
| `src/components/layout/StatusLine.tsx:13` | коментар «фон #212121» | документація (клас вже `bg-background`) | Текст коментаря → «фон #080603 (bg-background)» |
| `src/components/games/ViewSelector.tsx:76` | `text-[#323232]` | text/on-brand (текст кнопки-дропдауну на оранжевому) | → `text-surface` |
| `src/components/games/BetActionButton.tsx:31` | `text-[#323232]` | text/on-brand (іконка на action-кнопці, варіанти book/disabled) | → `text-surface` |
| `src/components/games/CurrencyPricePlate.tsx:12` | коментар «Темний фон #212121» | документація | Текст → «Фон плашки = фон сторінки (bg-background)» |
| `src/components/games/CurrencyPricePlate.tsx:17` | `bg-[#212121]` | фон сторінки/канви (плашка навмисно = кольору фону, з рамкою) | → `bg-background` |
| `src/components/games/GameHeader.tsx:81` | `text-[#323232]` | text/on-brand (іконка «лише мої» на оранжевому) | → `text-surface` |
| `src/components/games/chart/ChartOverlays.tsx:40` | `text-[#323232]` | text/on-brand (текст боксу контролера на білому) | → `text-surface` |
| `src/components/games/chart/ChartOverlays.tsx:41` | `text-[#323232]` | text/on-brand (текст боксу контролера на оранжевому) | → `text-surface` |
| `src/components/games/chart/ChartOverlays.tsx:83` | `bg-[rgba(50,50,50,0.75)]` | surface/плашка (пул), rgba-еквівалент grey/800 75% | → `bg-surface/75` (Tailwind opacity-modifier на токені, автоматично дає `rgba(33,33,33,.75)`) |
| `src/components/games/chart/drawChart.ts:13` | `bg: '#212121'` | фон канви (background/default) | → `#080603` + коментар `// = --color-background` |
| `src/components/games/chart/drawChart.ts:21` | `currentLabelBg: '#212121'` | плашка поточної ціни (той самий патерн, що CurrencyPricePlate: фон-кольору заливка + оранжева штрихова рамка) | → `#080603` + коментар з поясненням |
| `src/components/onboarding/OnboardingStepper.tsx:16` | коментар «база #212121» | документація | Текст → опис через bg-background |
| `src/components/onboarding/OnboardingStepper.tsx:22` | `bg-[#212121]` | фон сторінки (трек степера навмисно = кольору фону) | → `bg-background` |
| `src/components/profile/ProfileStats.tsx:43,52,61` | `bg-[rgba(50,50,50,0.75)]` (×3) | surface/плашка лічильника | → `bg-surface/75` |
| `src/components/games/PredictionStats.tsx:22` | `bg-[rgba(50,50,50,0.75)]` | surface/плашка статистики | → `bg-surface/75` |
| `src/pages/OnboardingPage.tsx:50,101` | `bg-[#080603]` (×2) | фон сторінки (уніфікація, п.3 брифу) | → `bg-background` |

Разом: **22 місця** (18 функціональних hex/rgba-заміни + 4 текстові коментарі), плюс 2 токени в `@theme`. Оцінка брифу була ≈17 — різниця через 4 коментарі-згадки (TopBar, StatusLine, CurrencyPricePlate, OnboardingStepper), які формально не hex-код, але згадують значення й були оновлені для консистентності документації.

## Технічне рішення: `bg-surface/75` замість hex rgba

Для 5 входжень `rgba(50,50,50,0.75)` (ProfileStats×3, PredictionStats×1, ChartOverlays×1) використав Tailwind v4 opacity-modifier на токені (`bg-surface/75`) замість хардкод-hex `rgba(33,33,33,0.75)`. У проєкті це вже усталений патерн (`bg-black/60`, `border-white/50`, `bg-white/40`) — токен автоматично підхоплює нове значення `--color-surface`, якщо палітра ще раз зміниться.

## Наслідки контрасту (п.4 брифу)

Перевірив: інверсій «surface як фон сторінки» **НЕ знайдено** — всі `bg-background`-контейнери це кореневі page/layout-обгортки (`AppLayout`, `GameLayout`, `*Page.tsx`), всі `bg-surface` — елевовані панелі/картки (`BottomNav`, `CreateFooter`, `PixelCard`, `BetPanel` тощо). Контраст surface-на-background справді зріс (очікувано за новою палітрою) — не чіпав.

Окремо зафіксував (не баг, а свідомий існуючий патерн): `CurrencyPricePlate` і `drawChart.ts:currentLabelBg` навмисно використовують колір **фону**, а не surface, для «плашки з рамкою» — це узгоджений стиль з макету (плашка «вирізана» в фоні, а не елевована картка), тепер вона стала майже чорною разом з фоном сторінки — це відповідає новій палітрі, не виправляв.

## Поза скоупом

`website/` не чіпав. Backend/контент не чіпав. git commit не робив.
