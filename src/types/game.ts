/** Модель однієї гри-прогнозу для картки. */
export interface Game {
  /** Унікальний ідентифікатор гри. */
  id: string
  /** Назва гри. */
  title: string
  /** Автор гри (відображається як "User_name"). */
  author: string
  /** Ціна одного квитка в TON (напр. "0.1"). */
  ticketPrice: string
  /** Призовий фонд у TON (напр. "2.4"). */
  prize: string
  /** Кількість квитків користувача в цій грі. */
  ticketsCount: number
  /** Початок гри (epoch ms) — точка старту таймлайну. */
  startTime: number
  /** Час закриття прийому ставок (epoch ms). */
  betCloseTime: number
  /** Кінець гри (epoch ms) — кінець таймлайну. */
  endTime: number
  /** Чи є поточний користувач автором гри (показує кнопку копіювання). */
  isAuthor?: boolean
}
