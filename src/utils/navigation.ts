/** Утиліти безпечної навігації історією браузера (уникають зациклень «Back»). */

import type { NavigateFunction } from 'react-router-dom'

/** Форма стану History API, яку підтримує react-router (idx — глибина стеку). */
interface HistoryStateWithIdx {
  idx?: number
}

/**
 * Йде на крок назад в історії, якщо там дійсно є попередній запис (idx > 0),
 * інакше — детерміновано переходить на `fallback` (replace, без нового запису).
 * Використовується скрізь, де «Back» має гарантовано кудись привести, а не
 * впертися у порожню історію чи чужий проміжний екран (create-game, /buy).
 */
export const goBackOrFallback = (navigate: NavigateFunction, fallback: string): void => {
  const idx = (window.history.state as HistoryStateWithIdx | null)?.idx ?? 0
  if (window.history.length > 1 && idx > 0) {
    navigate(-1)
  } else {
    navigate(fallback, { replace: true })
  }
}
