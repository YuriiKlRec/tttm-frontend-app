/** Утиліти форматування часу для таймерів та відліків. */

/** Обмежує число діапазоном [min, max]. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** Доповнює число до двох цифр нулем зліва. */
const pad2 = (n: number): string => String(n).padStart(2, '0')

/**
 * Форматує тривалість (ms) як зворотній відлік `HH:MM:SS`.
 * Від'ємні значення трактуються як 0.
 */
export const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

/** Форматує epoch ms як коротку дату/час, напр. "Jan 1, 10:00". */
export const formatDateTime = (epochMs: number): string => {
  const date = new Date(epochMs)
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}
