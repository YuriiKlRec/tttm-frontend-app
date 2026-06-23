/** Моки ігор для вкладки Waiting (ігри, у яких користувач бере участь). */

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

const MINUTE = 60_000
const now = Date.now()

/**
 * Дві гри для демонстрації обох станів картки:
 * - btc-1: користувач НЕ лідер (показано лідера + свою ставку);
 * - eth-1: користувач лідирує (один рядок + відхилення від ринку).
 */
export const mockWaitGames: WaitGame[] = [
  {
    id: 'btc-1',
    title: 'Label',
    author: 'User_name',
    reward: '2.4 TON',
    startTime: now - 25 * MINUTE,
    betCloseTime: now - 5 * MINUTE,
    endTime: now + 5 * MINUTE,
    leader: { rank: 1, user: '@User_4', price: '$57,212.46', mine: false },
    mine: { rank: 24, user: '@User_name', price: '$58,212.46', mine: true },
  },
  {
    id: 'eth-1',
    title: 'Label',
    author: 'User_name',
    reward: '2.4 TON',
    startTime: now - 25 * MINUTE,
    betCloseTime: now - 5 * MINUTE,
    endTime: now + 5 * MINUTE,
    leader: { rank: 1, user: '@User_name', price: '$58,212.46', mine: true },
    mine: { rank: 1, user: '@User_name', price: '$58,212.46', mine: true },
    deviationPercent: 0.17,
  },
]
