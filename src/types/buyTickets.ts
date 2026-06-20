/** Типи доменної моделі сторінки оплати заброньованих ставок. */

/** Статус однієї ставки в чеку. */
export type TicketStatus = 'active' | 'inactive' | 'taken'

/** Статус оплати чека. */
export type CheckStatus = 'pending' | 'paid'

/** Одна заброньована ставка зі станом. */
export interface Ticket {
  /** Ціна прогнозу (USD). */
  price: number
  /** Поточний стан ставки. */
  status: TicketStatus
}

/** Чек — група ставок (≤ CHUNK_SIZE), що оплачується окремо. */
export interface Check {
  /** Ставки чека. */
  tickets: Ticket[]
  /** Статус оплати чека. */
  status: CheckStatus
}
