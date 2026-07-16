# Інтеграція Amplitude (Analytics + Session Replay) у Mini App

Репозиторій: `/Users/yuriikl/Code/its/Reack-and-Next/tttm/frontend-1.0` (React 19 + Vite + TS strict, чистий клієнтський SPA). **git commit НЕ робиш** — коміт зробить оркестратор після верифікації.

## Головна умова (від користувача)
**Ключ через env. Якщо ключа нема — SDK взагалі НЕ вантажиться** (ні ініціалізації, ні мережевих запитів, ні SDK-чанка в мережі). Реалізуй через dynamic import після перевірки ключа.

## Кроки
1. `npm install @amplitude/unified`.
2. Env: у `src/config/env.ts` додай `amplitudeApiKey: string | null` (`import.meta.env.VITE_AMPLITUDE_API_KEY`, порожньо/undefined → null). У `.env` додай `VITE_AMPLITUDE_API_KEY=3654a9d3c72de8e77fe9cc5ff9e1f6d8`, у `.env.example` — `VITE_AMPLITUDE_API_KEY=` (порожній).
3. Новий сервіс `src/services/analytics.ts` (єдине місце роботи з Amplitude, компоненти SDK напряму не чіпають):
   - Синглтон-ініціалізація РІВНО один раз за життя застосунку (module-level guard; безпечно до StrictMode подвійного mount).
   - `initAnalytics(): void` — якщо `env.amplitudeApiKey` falsy → тихий no-op назавжди. Інакше `const amplitude = await import('@amplitude/unified')` і `amplitude.initAll(env.amplitudeApiKey, { serverZone: 'EU', analytics: { autocapture: true }, sessionReplay: { sampleRate: 1 } })`.
   - `trackEvent(name: string, props?: Record<string, unknown>): void` — до завершення init події складати в невеликий буфер (масив, флаш після init); без ключа — no-op. До кожної події підмішувати «super properties» (див. п.5).
   - `identifyPlayer(user): void` — `setUserId(user.id)` + user properties через `Identify` (мінімум: `nickname`, `language`, `tg_user_id` якщо доступний через token-storage). Без ключа — no-op.
   - `resetAnalytics(): void` — `amplitude.reset()` (виклич у точці повного wipe сесії при зміні tg-акаунта в AuthProvider).
   - ЖОДНИХ токенів/секретів у properties.
4. Події (назви точно ці, snake_case — з аналітичної спеки):
   - `app_opened` — один раз при старті застосунку (там же, де викликається initAnalytics — корінь клієнтського додатка, напр. `App.tsx`/`main.tsx`).
   - `player_authorized` — після успішної автентифікації: `AuthProvider.applyAuthResponse` (+ одразу `identifyPlayer(user)`); також після відновлення сесії за токеном (спроби 1/2 у initializeAuth) — identify без події `player_authorized` (це не нова авторизація), АБО якщо простіше — identify всередині applyAuthResponse і в обох success-гілках відновлення.
   - `game_viewed` — на mount сторінки гри `GamePage` (props: `game_id`). Один раз на відкриття, не на кожен ре-рендер.
   - `bet_placed` — після УСПІШНОГО підтвердження купівлі квитків (знайди success-точку флоу оплати — там, де createTickets/підтвердження пройшло; props: `game_id`, `tickets_count`, `amount_gram`). Якщо оплата йде чанками — по одній події на успішний чанк АБО одна на весь ордер: обери те, що природніше лягає в наявний код, і зафіксуй вибір у звіті.
   - `game_create_started` — на mount `CreateGamePage`.
   - `game_created` — після успішного `createGame` (props: `game_id`).
5. Super properties (клеяться до всіх подій): `app_language` (поточна мова i18n), `platform: 'telegram-webapp' | 'browser'` (чи є Telegram launch params), `app_env` (tonNetwork з env). Реалізуй просто: module-level об'єкт у analytics.ts + сеттер, підмішується у trackEvent.
6. Обмеження:
   - ВСЕ тільки client-side (SPA — ок, але guard `typeof window === 'undefined'` у initAnalytics не завадить).
   - Компоненти викликають лише `trackEvent`/`identifyPlayer` з сервісу — прямих імпортів `@amplitude/unified` поза analytics.ts бути не може.
   - Не ламай нічого в існуючих флоу; аналітика повністю fire-and-forget (без await у бізнес-логіці, без впливу на UX при помилках SDK — обгорни виклики SDK у try/catch).
   - Серверні/фінансові події зі спеки («Брать с бека») — ПОЗА скоупом, backend не чіпай.

## Верифікація (числова, Playwright НЕ використовуй — жива перевірка за оркестратором)
- `npx tsc -b` чисто; `npm run build` зелений; lint не гірше базлайну (заміряй до змін).
- У build-виводі SDK має бути ОКРЕМИМ lazy-чанком (не в основному bundle) — покажи рядок з manifest/розмірами.
- grep: `@amplitude` імпортується лише в analytics.ts.

## Звіт
`.sdd/amplitude-report.md`: статус, файли, де саме які події повішені, вибір по bet_placed (чанк/ордер), 1 рядок tsc/build/lint + рядок про чанк. Фінальне повідомлення: статус + файли + concerns.
