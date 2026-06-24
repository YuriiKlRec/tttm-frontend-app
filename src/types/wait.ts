/** View-model типи ігор у очікуванні для вкладки Waiting. */

/** Одна ставка у короткому списку Wait-картки. */
export interface WaitBet {
  /** Ранг у рейтингу. */
  rank: number
  /** Нік гравця (з @ або ім'ям). */
  user: string
  /** Спрогнозована ціна (форматована, напр. "$57,212.46"). */
  price: string
  /** Чи це ставка поточного користувача. */
  mine: boolean
}

/** Гра, у якій бере участь користувач і яка очікує фіналізації. */
export interface WaitGame {
  /** Ідентифікатор гри. */
  id: string
  /** Назва гри. */
  title: string
  /** Організатор. */
  author: string
  /** Винагорода (напр. "2.4 TON"). */
  reward: string
  /** Старт гри (epoch ms) — для прогресу кільця. */
  startTime: number
  /** Закриття прийому ставок (epoch ms). */
  betCloseTime: number
  /** Кінець гри / фіналізація (epoch ms). */
  endTime: number
  /** Лідер рейтингу (ранг 1). */
  leader: WaitBet
  /** Ставка поточного користувача. */
  mine: WaitBet
  /** Відхилення своєї ціни від ринку, % (показуємо, коли користувач лідирує). */
  deviationPercent?: number
}
