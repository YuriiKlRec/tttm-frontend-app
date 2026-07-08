# Раунд 7 — звіт

Джерело: Figma `sjYaf8Zax1vT2STG6pJPMd`, вузли `1360:11010` (users online) та `1251:3758` (topbar).

## Зміна 1 — Плашка «users online» (`src/components/layout/StatusLine.tsx`)

1. **Пульсація квадратика.** Додано `animate-status-pulse` (клас на `<span>`-індикаторі). У
   `src/styles/index.css` — `@keyframes status-pulse` (opacity `1 → 0.3 → 1`) і `@utility
   animate-status-pulse` з `animation: status-pulse 1.2s ease-in-out infinite`. Усередині утиліти —
   `@media (prefers-reduced-motion: reduce) { animation: none; }`. Перевірено у зібраному CSS
   (`dist/assets/index-*.css`): обидва правила присутні й коректно scoped.
2. **Фон плашки.** У Figma: `bg-[#212121]` (= токен `--color-background`), border dashed
   `rgba(255,255,255,0.25)` (= токен `--color-border-dashed`), padding `px-[16px] py-[6px]`.
   Токени фону/бордера в проєкті вже збігались (`bg-background` + `border-border-dashed`); єдине
   реальне розходження — вертикальний padding: було `py-1` (4px), стало `py-1.5` (6px), точно за
   макетом. Розмір індикатора (`size-[8px]` → `h-2 w-2`) вже збігався.

Верифікація: скріншот `after-statusline.png` (Playwright, 390×844) проти Figma-скріна вузла
1360:11010 — фон/бордер/розміри/padding збігаються (текст і лічильник різні через мову/дані —
очікувано). Пульсацію перевірено через `getComputedStyle(dot).opacity` у трьох точках часу з
інтервалом 700ms: `0.46 → 0.95 → 0.30` — значення коливаються, анімація активна.

## Зміна 2 — Шапка (`src/components/layout/TopBar.tsx`, `src/components/ui/IconButton.tsx`)

1. **Фон.** Figma: `bg-[var(--background/default,#212121)]` + `border-b
   border-[rgba(255,255,255,0.15)]`. Це вже було в коді (`bg-background` + `border-border-solid`) —
   змін не знадобилось, звірено скріншотом.
2. **Іконка перед логіном.** У макеті — растрова ілюстрація «шолом» (`illustration/helmet`,
   32×32px) перед `@User_name`. Завантажено PNG-експорт вузла `1901:22033` через
   `download_assets`, збережено як `src/assets/icon-helmet.png`, додано в `TopBar.tsx` (`h-8 w-8`,
   `gap-1.5` до тексту, як `gap-[6px]` у макеті).
3. **Кольори.** Текст логіна: було `text-[15px] font-bold text-text-primary` (білий), стало
   `text-[14px] font-semibold text-text-focus` (`#ef9723`, точний розмір і колір з Figma
   `font-['Geist:SemiBold'] text-[14px] text-[color:var(--text/focus,#ef9723)]`). Ваги 600
   (Semibold) у проєкті не було імпортовано — додано `@import "@fontsource/geist-sans/600.css"` в
   `index.css` для коректного рендеру ваги (раніше були лише 400/700).
4. **Кнопка додавання гри.** Іконка `icon-plus.svg` рендерилась `h-5 w-5` (20px), у макеті
   `icon/plus-large` — `size-[16px]`. Додано проп `iconSize?: 'md' | 'sm'` у `IconButton`
   (за замовчуванням `'md'` = 20px, як було — щоб не зачепити інше використання компонента в
   `GameCard` для кнопки копіювання лінку), і застосовано `iconSize="sm"` (16px) лише для кнопки
   створення гри в `TopBar`. Розмір самої кнопки (36×28px) вже збігався з макетом — не чіпав.

Верифікація: скріншоти `after-topbar.png` / `after-home.png` (390×844) проти Figma-скріна вузла
1251:3758 — шолом, колір і розмір тексту логіна, розмір плюс-іконки збігаються. Кнопку гаманця
(`WalletButton` = сторонній `TonConnectButton`) не чіпав — у макеті показано інший стан
(«гаманець підключено», адреса), у брифі це не входило до списку 4 пунктів зміни 2, а стилізація
готового tonconnect-віджету — окрема задача поза скоупом.

## Зміна 3 — Прибрати два елементи

1. **Пояснювальний текст під заголовком.** Знайдено в `src/components/ui/Hero.tsx`
   (використовується лише в `PredictionsPage`) — `<p>{t('predictions.heroSubtitle')}</p>` під
   `<h1>{t('predictions.heroTitle')}</h1>`. WaitingPage і ResultsPage такого підзаголовка не мали.
   Видалено `<p>` і виклик `t('predictions.heroSubtitle')`.

   **Concern:** переклади в проєкті — не локальні файли, а завантажуються з бекенд-API
   (`GET /api/i18n/translations/:lang`, див. `src/services/i18nApi.ts` +
   `src/i18n/I18nProvider.tsx`); `src/mocks/` порожній. Ключ `predictions.heroSubtitle`
   фізично лежить у сусідньому репозиторії — `backend/src/i18n/translations.seed.ts:198`
   (є і `predictions.heroTitle` поруч, рядок 192, — той залишається, бо заголовок не видаляли).
   Це окремий репозиторій з окремим комітом за CLAUDE.md, тож ключ із бекенд-сіда **не видалено** —
   потрібен окремий follow-up у `backend/`. У frontend-1.0 ключ більше ніде не викликається
   (`grep -rn heroSubtitle src` — порожньо після зміни), фронтенд-частина зроблена повністю.

2. **Валютна пара з іконкою.** `src/components/games/CurrencyPricePlate.tsx` прибрано з рендеру
   `WaitingPage.tsx` (разом з мертвим кодом, який існував лише для неї: `useBinancePrice`,
   `centsToUsd`, обчислення `livePrice`/`priceStr`, обгортковий `<div className="-mt-8 ...">`).
   Файл компонента **не видалено** — він досі використовується в `PredictionsView.tsx` і
   `DetailsView.tsx` (сторінка гри), тобто не є мертвим кодом. Перекладів усередині компонента
   немає (він приймає `price` пропом), тож ключів для видалення не було.

Верифікація: `after-waiting.png` — плашка курсу відсутня, список одразу під StatusLine зі
стандартним відступом сторінки (як на Predictions/Results), консоль без помилок.

## Загальна верифікація

- **Playwright, 390×844:** Home (uk/en/ru), Waiting — скріншоти зняті, звірені з Figma-експортами
  вузлів 1360:11010 і 1251:3758; консоль без нових помилок/попереджень.
- **3 мови:** перемкнуто `en`/`ru`/`uk` через `localStorage['i18n.lang']` + reload — жодних видимих
  «сирих» ключів, EN/RU/UK рендерять коректно без heroSubtitle.
- **Lint:** `npm run lint` — 9 проблем (8 errors, 1 warning), ідентичні базовому `main` (перевірено
  через `git stash` + lint до моїх змін) — усі в файлах, яких я не торкався (`AppLayout.tsx`,
  `AuthProvider.tsx`, `BookedCartProvider.tsx`, `useGameLive.ts`, `useInfiniteGames.ts`). Нових
  помилок від моїх змін — 0.
- **Тести:** у проєкті немає `test`-скрипта, vitest не налаштований, тестових файлів не знайдено —
  пропущено (нема що запускати).
- **tsc:** `npx tsc -b` — чисто, без виводу.
- **build:** `npm run build` — успішно (попередження про розмір чанка — існуюче, не пов'язане зі
  змінами).

## Коміти

1. `666035e` — Pulse the online-status dot and fix plate padding
2. `3a38284` — Match topbar to design: helmet icon, colors, smaller plus
3. `b79deb8` — Drop hero subtitle and price plate from waiting list
