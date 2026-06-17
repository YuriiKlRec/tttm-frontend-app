import { useEffect, useState } from 'react'

/**
 * Живий поточний час (epoch ms), що оновлюється щосекунди.
 * Використовується для зворотного відліку та обчислення часток таймлайну.
 * @param intervalMs період оновлення в мілісекундах (за замовчуванням 1000)
 */
export const useNow = (intervalMs = 1000): number => {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
