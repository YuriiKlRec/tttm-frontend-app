/** Утиліти роботи з ціною прогнозу (2 знаки після коми, порівняння через toFixed). */

/** Статус введеної ціни щодо станів квитка. */
export type PriceStatus = 'empty' | 'taken' | 'yours' | 'booked-active' | 'bookable'

/**
 * Парсить рядок вводу у число-ціну.
 * Повертає NaN, якщо рядок порожній або не число.
 */
export const parsePrice = (input: string): number => {
  if (input.trim() === '') {
    return NaN
  }
  const value = Number(input)
  return Number.isFinite(value) ? value : NaN
}

/** Ключ для стабільного порівняння цін (уникає похибок float). */
const priceKey = (value: number): string => value.toFixed(2)

/** Сума корзини у TON: кількість квитків × ціна квитка (напр. "0.3 TON"). */
export const totalTon = (count: number, ticketPrice: string): string =>
  `${(count * Number(ticketPrice)).toFixed(1)} TON`

/** Форматує число-ціну у вигляд "$65,000.00". */
export const formatUsd = (value: number): string =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Чи містить список ціну (порівняння через toFixed(2)). */
export const includesPrice = (list: number[], value: number): boolean => {
  const key = priceKey(value)
  return list.some((item) => priceKey(item) === key)
}

/** Прибирає ціну зі списку (порівняння через toFixed(2)). */
export const removePrice = (list: number[], value: number): number[] => {
  const key = priceKey(value)
  return list.filter((item) => priceKey(item) !== key)
}

/**
 * Санітизує сирий ввід: приймає і крапку, і кому як десятковий розділювач
 * (кома нормалізується у крапку — той самий підхід, що й у TicketPriceField),
 * лишає цифри й одну крапку, обрізає до 2 знаків після коми.
 */
export const sanitizePriceInput = (raw: string): string => {
  const cleaned = raw.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) {
    return cleaned
  }
  const intPart = cleaned.slice(0, firstDot)
  const fracPart = cleaned.slice(firstDot + 1).replace(/\./g, '')
  return `${intPart}.${fracPart.slice(0, 2)}`
}

/** Визначає статус ціни за наборами зайнятих/власних/заброньованих цін. */
export const resolvePriceStatus = (
  price: number,
  takenByOthers: number[],
  yourTickets: number[],
  bookedPrices: number[],
): PriceStatus => {
  if (!Number.isFinite(price) || price <= 0) {
    return 'empty'
  }
  if (includesPrice(takenByOthers, price)) {
    return 'taken'
  }
  if (includesPrice(yourTickets, price)) {
    return 'yours'
  }
  if (includesPrice(bookedPrices, price)) {
    return 'booked-active'
  }
  return 'bookable'
}
