import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { backButton } from '@telegram-apps/sdk'

/**
 * Керує нативною кнопкою «назад» Telegram Mini App.
 * Показує кнопку на всіх маршрутах, окрім кореня `/`; за кліком викликає
 * `customHandler` (якщо передано) або повертає назад через React Router.
 * Поза Telegram-оточенням усі виклики SDK безпечно ігноруються.
 *
 * @param customHandler Якщо задано — використовується замість стандартного navigate(-1).
 *   Передавати лише на маршрутах, де потрібна власна логіка виходу (наприклад, /buy).
 */
export function useTelegramBackButton(customHandler?: () => void): void {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // На корені та /welcome нативну «назад» ховаємо — Telegram показує свою
    // стандартну кнопку Close (✕), яка закриває Mini App.
    const noBackButton = location.pathname === '/' || location.pathname === '/welcome'
    // Глобальний виклик (без customHandler) пропускає /buy — там хук
    // викликається окремо з власним обробником (BuyTicketsPage).
    const isBuyWithoutCustom = location.pathname === '/buy' && customHandler === undefined

    const handler = (): void => {
      if (customHandler) {
        customHandler()
        return
      }
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
      if (window.history.length > 1 && idx > 0) {
        navigate(-1)
      } else {
        navigate('/')
      }
    }

    try {
      backButton.mount()
    } catch {
      // Поза Telegram — кнопки немає, виходимо
      return
    }

    if (noBackButton || isBuyWithoutCustom) {
      backButton.hide()
      return () => {}
    }

    backButton.show()
    backButton.onClick(handler)

    return () => {
      backButton.offClick(handler)
      backButton.hide()
    }
  }, [location.pathname, navigate, customHandler])
}
