/** Чисті функції розрахунку розподілу призового фонду та точки беззбитковості. */

/** Одноразова комісія за створення контракту (TON), константа. */
export const CREATION_FEE_TON = 0.2

/** Мінімальна частка хоста (pool, %) у макеті. */
export const POOL_MIN = 5

/** Максимальна частка хоста (pool, %) у макеті. */
export const POOL_MAX = 30

/** Розподіл призового фонду у відсотках. */
export interface PrizeSplit {
  /** Частка хоста (You) = 0.8 × pool. */
  host: number
  /** Частка платформи = 0.2 × pool. */
  platform: number
  /** Частка переможця = 100 − pool. */
  winner: number
}

/**
 * Обчислює розподіл призового фонду за host-долею `pool` (%).
 * Host = 0.8 × pool, Platform = 0.2 × pool, Winner = 100 − pool.
 */
export const calcPrizeSplit = (pool: number): PrizeSplit => ({
  host: 0.8 * pool,
  platform: 0.2 * pool,
  winner: 100 - pool,
})

/**
 * Форматує відсоток для показу: ціле без дробу, інакше з 1 знаком (напр. «17.6%»).
 */
export const formatPercent = (value: number): string => {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`
}

/**
 * Точка беззбитковості хоста: скільки прогнозів треба, щоб відбити комісію.
 * N = ceil(CREATION_FEE / (ticketPrice × hostFraction)), де hostFraction = (0.8 × pool)/100.
 * Повертає null, якщо знаменник недодатній/нескінченність (показати «—»).
 */
export const calcBreakEven = (ticketPrice: number, pool: number): number | null => {
  const hostFraction = (0.8 * pool) / 100
  const perTicketProfit = ticketPrice * hostFraction
  if (!Number.isFinite(perTicketProfit) || perTicketProfit <= 0) return null
  return Math.ceil(CREATION_FEE_TON / perTicketProfit)
}
