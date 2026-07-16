# Лічильник ставок на картці гри + живе оновлення списків — звіт

Статус: **ГОТОВО**.

## 1. Маппер (`toGameCard`)

`src/services/mappers.ts` — `ticketsCount` тепер `dto.tickets.length` (усі ставки гри),
замість фільтра по `ownerId === myUserId`. Коментар оновлено. `myUserId` лишається
потрібним параметром функції — використовується для `isAuthor`.

`toWaitCard`/`ticketsTotal` і `toResultCard`/`ticketsCount` (семантика «мої» для
результатів) — НЕ чіпались, як і вимагав бриф.

`src/types/game.ts` — JSDoc `Game.ticketsCount`: «Кількість ставок (квитків) у грі
загалом — усіх гравців, не лише поточного» (було «квитків користувача»).

### Споживач (`GameCard.tsx`)

Умова показу бейджа (`hasTickets = ticketsCount > 0`) не зав'язана на «мої» — це вже
було нейтрально по коду, лише коментар над бейджем оновлено на «кількість усіх
ставок у грі». Бейдж і далі ховається при 0 ставок — узгоджено з макетом (1360:10842),
поведінка не змінилась структурно, лише сенс числа.

**Concern**: sr-only-текст поруч ціни й далі використовує ключ перекладу
`game.youHaveTickets` (напр. «у вас N квитків») — його фактичний рядок керується
бекендом/CMS (i18n завантажується через `I18nProvider`/`i18nApi`, не в цьому репо), і
бриф explicit забороняє чіпати бекенд. Тепер число в цьому реченні означає «усього
ставок у грі», а не «у вас» — семантичний розрив для screen-reader користувачів.
Створювати новий ключ без бекенд-запису небезпечно (без перекладу впаде на сирий
ключ — гірше за поточний стан). Потрібне окреме узгодження копірайту з
контент-командою; технічно поза зоною цього фіксу.

## 2. Помірний фоновий refetch (`useInfiniteGames`)

`src/hooks/useInfiniteGames.ts` — новий 3-й параметр `refreshMs?: number` (не
обов'язковий, за замовчуванням вимкнено).

### Логіка

- `refresh()` — перезавантажує сторінки `1..pageRef.current` **паралельно**
  (`Promise.all`, зазвичай 1-2 запити по 10), зливає в один масив, замінює
  `items`+`total` ОДНИМ `setState` — без `setLoading(true)` (loading лишається лише
  для першого завантаження/`loadMore`), тому мерехтіння немає.
- Таймер: `setInterval(tick, refreshMs)`, `tick()` пропускає виклик, якщо
  `document.hidden`. Окремий листенер `visibilitychange` викликає `refresh()`
  негайно щойно вкладка знову видима (сценарій «повернувся з покупки/іншої
  вкладки») — не чекає наступного тіку.
- Помилка `refresh()` — `console.warn`, `items`/`total` не чіпаються (catch без
  side-effect на стан).
- Новий `hasLoadedRef` — `refresh()` виходить одразу, якщо перша сторінка ще не
  завантажилась (немає сенсу рефрешити порожній список).

### Рішення по гонках із пагінацією

Один спільний `isLoadingRef` guard'ить і `loadPage`(включно з `loadMore`), і
`refresh()` — вони НІКОЛИ не виконуються одночасно:

- Якщо триває `loadMore`/початкове завантаження → `refresh()` бачить
  `isLoadingRef.current === true` на вході й виходить одразу, спробує знову на
  наступному тіку (`refreshMs`) — саме те спрощення, яке прописане в брифі.
- Якщо триває `refresh()` і користувач доскролив до сентінела → `loadMore()`
  бачить той самий `isLoadingRef.current === true` і виходить без запиту (жодного
  дубльованого/накладеного фетчу сторінки).
- Самозцілення пропущеного `loadMore`: після завершення `refresh()` `items`/`total`
  зазвичай змінюються (нові ставки/ігри) → ідентичність `loadMore` (useCallback з
  deps `items.length`/`total`/`page`) міняється → ефект `IntersectionObserver`
  нижче перестворює спостерігач і викликає `observer.observe(sentinel)` — нативна
  поведінка `IntersectionObserver`: одразу віддає callback з поточним станом
  перетину для вже спостережуваного елемента, тобто якщо сентінел і далі у
  viewport — `loadMore()` фактично викликається повторно сам, без ручного коду.
  Єдиний теоретичний edge-case — якщо після `refresh()` `items.length` і `total`
  лишились БУКВАЛЬНО незмінними (жодної нової ставки за 30с), ідентичність
  `loadMore` не зміниться і спостерігач не перестворюється; тоді пропущений
  `loadMore` чекає наступної реальної інтеракції зі скролом (крайній випадок,
  прийнятний — брифом explicit дозволено «просто skip»).
- `pageRef`/`hasLoadedRef` — реф, не state: `refresh()` не входить у deps-ланцюжок
  через `items`, тому `setInterval`-ефект не перезбирається (і не скидає 30с
  таймер) на кожен рендер списку.

### Увімкнення

- `src/pages/PredictionsPage.tsx` — `useInfiniteGames(fetchPage, ready, 30_000)`.
- `src/pages/WaitingPage.tsx` — `useInfiniteGames(fetchPage, ready, 30_000)`.
- `src/pages/ResultsPage.tsx` — **не чіпався**, 3-й аргумент не передається →
  `refreshMs` лишається `undefined` → таймер-ефект виходить одразу (`!refreshMs`),
  жодного фонового рефрешу для фінальних даних.

## tsc / build / lint

`npx tsc -b` — 0 помилок · `npm run build` — успішно (916 modules, лише
передіснуючий CSS/`--text/focus` та chunk-size warning, не пов'язані з фіксом) ·
`npx eslint .` (через `npm run lint`) — **7 errors/0 warnings**, ідентично базлайну
до змін (звірено `git stash`/lint/`git stash pop` — той самий набір 7 помилок у тих
самих файлах, жодної нової).

## Список змінених файлів

- `src/services/mappers.ts` — `toGameCard.ticketsCount` → усі ставки гри.
- `src/types/game.ts` — JSDoc `Game.ticketsCount`.
- `src/components/games/GameCard.tsx` — коментар над бейджем (сенс числа).
- `src/hooks/useInfiniteGames.ts` — опція `refreshMs`, `refresh()`, таймер +
  visibilitychange, нові refs (`pageRef`, `hasLoadedRef`).
- `src/pages/PredictionsPage.tsx` — `refreshMs: 30_000`.
- `src/pages/WaitingPage.tsx` — `refreshMs: 30_000`.

git commit НЕ робився (за інструкцією брифу).
