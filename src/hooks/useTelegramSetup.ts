import { useEffect } from 'react'
import { swipeBehavior, viewport } from '@telegram-apps/sdk'

/**
 * Початкове налаштування Telegram Mini App:
 *  - розгортає вʼюпорт на повну висоту (viewport.expand);
 *  - вимикає вертикальні свайпи (swipeBehavior.disableVertical), щоб свайп
 *    вниз НЕ згортав застосунок і не заважав скролу внутрішніх списків.
 * Поза Telegram (звичайний браузер) усі виклики SDK безпечно ігноруються.
 * Потребує Telegram 7.7+; на старіших версіях disableVertical просто no-op.
 */
export function useTelegramSetup(): void {
  useEffect(() => {
    // Розгортання вʼюпорта
    try {
      viewport.mount()
      viewport.expand()
    } catch {
      // поза Telegram — ігноруємо
    }

    // Вимкнення вертикальних свайпів (свайп-вниз більше не згортає апку)
    try {
      swipeBehavior.mount()
      if (swipeBehavior.disableVertical.isAvailable()) {
        swipeBehavior.disableVertical()
      }
    } catch {
      // поза Telegram або стара версія — ігноруємо
    }
  }, [])
}
