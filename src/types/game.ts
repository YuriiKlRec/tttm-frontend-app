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

/** Режим відображення центральної області сторінки гри. */
export type ViewMode = 'chart' | 'bets' | 'details'

/** Варіант рядка ставки у вигляді «Predictions». */
export type BetLineVariant = 'default' | 'mine' | 'win'

/** Одна ставка у списку прогнозів. */
export interface Bet {
  /** Ранг у списку (1..N). */
  rank: number
  /** Нік гравця з @ (напр. "@user"). */
  user: string
  /** Спрогнозована ціна (напр. "$57,212.46"). */
  price: string
  /** Варіант відображення (своя / виграшна / звичайна). */
  variant: BetLineVariant
}

/** Один рядок таблиці деталей гри (label → value). */
export interface DetailRow {
  /** Назва параметра ліворуч. */
  label: string
  /** Значення параметра праворуч. */
  value: string
}

/** Група рядків деталей (між групами — штриховий дивайдер). */
export type DetailGroup = DetailRow[]

/** Детальна модель гри для окремої сторінки `/game/:id`. */
export interface GameDetail {
  /** Унікальний ідентифікатор гри. */
  id: string
  /** Назва гри. */
  name: string
  /** Ціна одного квитка в TON (напр. "0.1"). */
  ticketPrice: string
  /** Час закриття прийому ставок (epoch ms). */
  betCloseTime: number
  /** Кінець гри (epoch ms) — для зворотного відліку в шапці. */
  endTime: number
  /** Ціни, вже зайняті іншими гравцями (порівняння через toFixed(2)). */
  takenByOthers: number[]
  /** Ціни квитків, що належать поточному користувачу. */
  yourTickets: number[]
}
