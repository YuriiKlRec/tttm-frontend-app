/** Моки завершених ігор для вкладки Results (різні фінальні стани). */

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

const DAY = 86_400_000
const HOUR = 3_600_000
const now = Date.now()

/** Мокова адреса смартконтракту (демо; реально приходить із бекенда). */
const MOCK_CONTRACT = 'EQAvDfWFG0oYX19jwNDNBBL1rKNT9XfaGP9HyTb5nb2Eml6y'

/**
 * П'ять завершених ігор, що покривають усі 4 стани й розкидані на 2 дати
 * (сьогодні / вчора) для перевірки групування за датою:
 * - won: своя ставка лідирує (корона, відхилення від ринку);
 * - processing: переможець + своя ставка, статус «Processing»;
 * - cancelled: ніхто не купив квиток, 0.0 TON, без ставок;
 * - lost: переможець отримав винагороду, своя ставка нижче;
 * - lost (вчора): другий приклад у групі минулої дати.
 */
export const mockResults: ResultGame[] = [
  {
    id: 'won-1',
    title: 'Test 2',
    author: 'User_name',
    contractAddress: MOCK_CONTRACT,
    status: 'won',
    reward: '2.4 TON',
    finishedAt: now - 2 * HOUR,
    finalPrice: '$57,342.47',
    ticketsCount: 1,
    mine: { rank: 1, user: '@User_name', price: '$58,212.46', mine: true },
    deviationPercent: 1.5,
  },
  {
    id: 'proc-1',
    title: 'Test 2',
    author: 'User_name',
    contractAddress: MOCK_CONTRACT,
    status: 'processing',
    reward: '2.4 TON',
    finishedAt: now - 4 * HOUR,
    finalPrice: '$57,342.47',
    ticketsCount: 1,
    leader: { rank: 1, user: '@User_4', price: '$57,212.46', mine: false },
    mine: { rank: 6, user: '@User_name', price: '$58,212.46', mine: true },
  },
  {
    id: 'cancel-1',
    title: 'Test 3',
    author: 'User_name',
    contractAddress: MOCK_CONTRACT,
    status: 'cancelled',
    reward: '0.0 TON',
    finishedAt: now - 6 * HOUR,
  },
  {
    id: 'lost-1',
    title: 'Test 2',
    author: 'User_name',
    contractAddress: MOCK_CONTRACT,
    status: 'lost',
    reward: '2.4 TON',
    finishedAt: now - DAY,
    finalPrice: '$57,342.47',
    ticketsCount: 1,
    leader: { rank: 1, user: '@User_4', price: '$57,212.46', mine: false },
    mine: { rank: 6, user: '@User_name', price: '$58,212.46', mine: true },
  },
  {
    id: 'lost-2',
    title: 'Test 1',
    author: 'User_name',
    contractAddress: MOCK_CONTRACT,
    status: 'lost',
    reward: '1.2 TON',
    finishedAt: now - DAY - 3 * HOUR,
    finalPrice: '$56,012.10',
    ticketsCount: 2,
    leader: { rank: 1, user: '@Trader_x', price: '$56,100.00', mine: false },
    mine: { rank: 12, user: '@User_name', price: '$55,400.00', mine: true },
  },
]
