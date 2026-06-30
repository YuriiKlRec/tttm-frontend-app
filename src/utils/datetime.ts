/** Утиліти форматування дати/часу та тривалості для форми створення гри. */

/**
 * Форматує ISO-рядок (або epoch ms) у локалізований рядок із урахуванням часового поясу.
 * Якщо tz === null або рядок порожній — використовує локальний TZ браузера.
 *
 * @example
 * formatInTz('2025-01-01T10:00:00Z', 'America/New_York', 'en-US') // "Jan 1, 17:00"
 * formatInTz('2025-01-01T10:00:00Z', null, 'uk-UA')               // локальний TZ, укр. місяці
 */
export function formatInTz(
  iso: string | number,
  tz: string | null,
  locale: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const defaults: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }
  return new Intl.DateTimeFormat(locale, {
    ...defaults,
    ...opts,
    ...(tz ? { timeZone: tz } : {}),
  }).format(typeof iso === 'string' ? new Date(iso) : iso)
}

/** Хвилина у мілісекундах. */
export const MINUTE_MS = 60_000

/** Година у мілісекундах. */
export const HOUR_MS = 60 * MINUTE_MS

/** Доповнює число до двох цифр нулем зліва. */
const pad2 = (n: number): string => String(n).padStart(2, '0')

/**
 * Округлює epoch ms ВГОРУ до найближчої цілої години.
 * Якщо момент уже точно на межі години — лишає без змін.
 */
export const ceilToHour = (epochMs: number): number => {
  const remainder = epochMs % HOUR_MS
  return remainder === 0 ? epochMs : epochMs + (HOUR_MS - remainder)
}

/**
 * Форматує epoch ms як повний рядок «24 Jun 2026 20:00:00».
 * Назва місяця локалізується через `locale`.
 * Секунди виносяться окремо (`seconds`), бо в макеті вони сірі.
 */
export const formatDateTimeFull = (
  epochMs: number,
  locale: string,
): { main: string; seconds: string } => {
  const date = new Date(epochMs)
  const month = date.toLocaleString(locale, { month: 'short' })
  const main = `${pad2(date.getDate())} ${month} ${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  return { main, seconds: `:${pad2(date.getSeconds())}` }
}

/**
 * Конвертує epoch ms у значення для `<input type="datetime-local">`
 * у локальному часовому поясі (формат «YYYY-MM-DDTHH:mm»).
 */
export const toDateTimeLocalValue = (epochMs: number): string => {
  const date = new Date(epochMs)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}`
}

/**
 * Форматує тривалість (у хвилинах) як «Xd Yh Zm», показуючи лише НЕпусті одиниці.
 * Для 0 хв повертає «0m».
 */
export const formatDuration = (totalMinutes: number): string => {
  const minutes = Math.max(0, Math.round(totalMinutes))
  if (minutes === 0) return '0m'
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const mins = minutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  return parts.join(' ')
}
