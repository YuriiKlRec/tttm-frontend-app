/** View-model типи завершених ігор для вкладки Results. */

/** Підсумковий стан завершеної гри. */
export type ResultStatus = 'won' | 'lost' | 'processing' | 'cancelled'

/** Одна ставка у короткому рейтингу Result-картки. */
export interface ResultBet {
  /** Ранг у фінальному рейтингу. */
  rank: number
  /** Нік гравця (з @ або ім'ям). */
  user: string
  /** Спрогнозована ціна (форматована, напр. "$58,212.46"). */
  price: string
  /** Чи це ставка поточного користувача. */
  mine: boolean
}

/** Завершена гра з фінальним результатом. */
export interface ResultGame {
  /** Ідентифікатор гри. */
  id: string
  /** Назва гри. */
  title: string
  /** Організатор. */
  author: string
  /** Адреса смартконтракту гри (для посилання в explorer). */
  contractAddress: string
  /** Підсумковий стан гри. */
  status: ResultStatus
  /** Винагорода (напр. "2.4 TON" / "0.0 TON"). */
  reward: string
  /** Дата/час завершення (epoch ms) — для групування та рядка фінальних даних. */
  finishedAt: number
  /** Фінальна ціна ринку на момент фіналізації (форматована, напр. "$57,342.47"). */
  finalPrice?: string
  /** Кількість квитків поточного користувача (для іконки в шапці). */
  ticketsCount?: number
  /** Переможець гри (ранг 1) — для lost/processing. */
  leader?: ResultBet
  /** Ставка поточного користувача. */
  mine?: ResultBet
  /** Відхилення своєї ціни від ринку, % (показуємо для won). */
  deviationPercent?: number
}
