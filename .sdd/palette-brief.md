# Оновлення палітри від дизайнера (grey/900–700)

Репозиторій: `/Users/yuriikl/Code/its/Reack-and-Next/tttm/frontend-1.0`. **git commit НЕ робиш** — коміт зробить оркестратор після візуальної верифікації.

## Зміни (дослівно від дизайнера)
| Токен | Ролі | Було | Стало |
|---|---|---|---|
| grey/900 | background/default | `#212121` | `#080603` |
| grey/800 | surface/default, text/on-brand, action/primary/on-action | `#323232` | `#212121` |
| grey/700 | surface/hover | `#3F3F3F` | `#323232` |

## Задача
1. **Токени** у `src/styles/index.css` `@theme`: `--color-background: #080603`, `--color-surface: #212121`. Додай `--color-surface-hover: #323232` ЯКЩО в коді реально є hover-використання #3F3F3F (перевір; якщо нема — не додавай, YAGNI, лише згадай у звіті).
2. **Захардкоджені входження** — знайди ВСІ: `grep -rn -i '212121\|323232\|3f3f3f' src --include='*.tsx' --include='*.ts'` (≈17 у ~10 файлах: StatusLine, PredictionButton, TopBar, CurrencyPricePlate, ViewSelector, GameHeader, BetActionButton, ChartOverlays, drawChart.ts, OnboardingStepper) + rgba-еквіваленти: `grep -rn 'rgba(50, *50, *50\|rgba(33, *33, *33\|rgba(63, *63, *63' src`. Для КОЖНОГО визнач семантичну роль і заміни:
   - роль «фон сторінки/канви» (#212121) → клас `bg-background`/`var(--color-background)` де можливо; у canvas (drawChart.ts) — новий hex `#080603` з коментарем-відповідником токена.
   - роль «поверхня/плашка/картка» (#323232, rgba(50,50,50,α)) → `bg-surface`/`var(--color-surface)` або hex `#212121` (rgba → 33,33,33 з тією ж альфою).
   - роль «текст/іконка на оранжевій кнопці» (text/on-brand, action/primary/on-action; зараз #323232) → `#212121` (або токен surface, якщо клас уже `text-surface`).
   - hover #3F3F3F → `#323232`.
   - НЕ чіпай кольори, що не входять у таблицю (оранж, червоний, btc, білі rgba-бордери).
   У звіті — таблиця «файл:рядок → роль → що зробив». Де заміна на токен неможлива/штучна — лишай hex зі значенням НОВИМ.
3. `src/pages/OnboardingPage.tsx` має `bg-[#080603]` — тепер це збігається з background: заміни на `bg-background` (уніфікація).
4. Подумай про наслідки контрасту: фон став майже чорним, surface = старий фон. Місця, де surface-елемент лежав на background і відрізнявся лише відтінком (плашки/картки), тепер контрастніші — це очікувано за новою палітрою, НЕ «виправляй». Але якщо десь background і surface використані НАВПАКИ (surface як фон сторінки) — зафіксуй у звіті.
5. `npx tsc -b` чисто; `npm run build` зелений; lint не гірше базлайну (7 err/0 warn).

## Поза скоупом
`website/` — інший Figma-файл, його палітру дизайнер не міняв. Backend/контент не чіпати.

## Звіт
`.sdd/palette-report.md`: статус, таблиця замін, чи додано surface-hover, concerns. Фінальне повідомлення: статус + кількість замін + concerns.
