/** Підтвердження дій через нативний Telegram-попап (з фолбеком поза Telegram). */

import { popup } from '@telegram-apps/sdk'

/** Ідентифікатор кнопки підтвердження в нативному попапі. */
const OK_ID = 'ok'
/** Ідентифікатор кнопки скасування в нативному попапі. */
const CANCEL_ID = 'cancel'

/**
 * Показує підтвердження дії: нативний `popup.show` у Telegram (два ключі —
 * OK/Cancel), а поза Telegram (dev у браузері) чи якщо попап недоступний —
 * `window.confirm`. Повертає true, якщо користувач підтвердив дію.
 */
export async function confirmViaTelegram(message: string): Promise<boolean> {
  try {
    if (popup.show.isAvailable()) {
      const pressedId = await popup.show({
        message,
        buttons: [
          { id: CANCEL_ID, type: 'cancel' },
          { id: OK_ID, type: 'ok' },
        ],
      })
      return pressedId === OK_ID
    }
  } catch {
    // Поза Telegram або SDK не ініціалізований — переходимо на фолбек нижче.
  }
  return window.confirm(message)
}
