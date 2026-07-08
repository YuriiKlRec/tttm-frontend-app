import { useEffect } from 'react'
import { closingBehavior } from '@telegram-apps/sdk'

/**
 * Керує нативним попередженням Telegram при спробі закрити Mini App
 * (`closingBehavior.enableConfirmation`/`disableConfirmation`) — доречно,
 * коли є незавершений флоу (напр. заброньовані, але ще не оплачені квитки).
 * Поза Telegram-оточенням виклики SDK безпечно ігноруються.
 *
 * @param active Чи потрібне попередження прямо зараз.
 */
export function useTelegramClosingConfirmation(active: boolean): void {
  useEffect(() => {
    try {
      closingBehavior.mount()
    } catch {
      // Поза Telegram — компонент недоступний, виходимо.
      return
    }

    try {
      if (active) {
        closingBehavior.enableConfirmation()
      } else {
        closingBehavior.disableConfirmation()
      }
    } catch {
      // Метод недоступний у цій версії клієнта — ігноруємо.
    }
  }, [active])
}
