import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { backButton } from '@telegram-apps/sdk'

/**
 * Керує нативною кнопкою «назад» Telegram Mini App.
 * Показує кнопку на всіх маршрутах, окрім кореня `/`; за кліком повертає
 * назад через React Router (або на `/`, якщо історії немає — direct link).
 * Поза Telegram-оточенням усі виклики SDK безпечно ігноруються.
 */
export function useTelegramBackButton(): void {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const isRoot = location.pathname === '/'

    const handler = (): void => {
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

    if (isRoot) {
      backButton.hide()
      return () => {}
    }

    backButton.show()
    backButton.onClick(handler)

    return () => {
      backButton.offClick(handler)
      backButton.hide()
    }
  }, [location.pathname, navigate])
}
