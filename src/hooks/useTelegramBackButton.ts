import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { backButton } from '@telegram-apps/sdk'
import { goBackOrFallback } from '../utils/navigation'

/**
 * Маршрути, де сторінка сама викликає хук із власним `customHandler`
 * (власна логіка виходу — попередження, детермінована ціль тощо).
 * Глобальний виклик (без customHandler) на цих маршрутах ховає кнопку і
 * нічого не робить — інакше буде подвійне керування (два onClick-хендлери).
 *
 * Маршрути: `/buy`, `/game/:id`, `/edit-profile`
 */
const hasOwnBackHandler = (pathname: string): boolean =>
  pathname === '/buy' || pathname.startsWith('/game/') || pathname === '/edit-profile'

/**
 * Керує нативною кнопкою «назад» Telegram Mini App.
 * Показує кнопку на всіх маршрутах, окрім кореня `/`; за кліком викликає
 * `customHandler` (якщо передано) або повертає назад через React Router
 * (крок в історії, якщо є куди, інакше — детерміновано на лобі).
 * Поза Telegram-оточенням усі виклики SDK безпечно ігноруються.
 *
 * @param customHandler Якщо задано — використовується замість стандартного navigate(-1).
 *   Передавати лише на маршрутах, де потрібна власна логіка виходу (напр. /buy, /game/:id).
 */
export function useTelegramBackButton(customHandler?: () => void): void {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // На корені та /welcome нативну «назад» ховаємо — Telegram показує свою
    // стандартну кнопку Close (✕), яка закриває Mini App.
    const noBackButton = location.pathname === '/' || location.pathname === '/welcome'
    // Глобальний виклик (без customHandler) пропускає маршрути з власним
    // обробником — там хук викликається окремо (BuyTicketsPage, GamePage).
    const ownHandlerElsewhere = hasOwnBackHandler(location.pathname) && customHandler === undefined

    const handler = (): void => {
      if (customHandler) {
        customHandler()
        return
      }
      goBackOrFallback(navigate, '/')
    }

    try {
      backButton.mount()
    } catch {
      // Поза Telegram — кнопки немає, виходимо
      return
    }

    if (noBackButton || ownHandlerElsewhere) {
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
