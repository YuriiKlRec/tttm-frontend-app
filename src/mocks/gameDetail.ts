import type { Bet, DetailGroup, GameDetail } from '../types/game'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Базова точка відліку для відносних часів моку. */
const now = Date.now()

/**
 * Мок детальної гри для сторінки `/game/:id`.
 * Підібрані значення дають усі стани введення ціни в BetPanel:
 * - taken: 64311.98 / 70000.00 / 59000.00 (зайняті іншими)
 * - yours: 62002.00 / 65500.50 (квитки користувача)
 * - bookable: будь-яка інша валідна ціна, напр. 63000.00
 */
export const mockGameDetail: GameDetail = {
  id: 'btc-70k',
  name: 'BTC above 70k?',
  ticketPrice: '0.1',
  // startTime — глибока історія для діапазону/кривої (не впливає на колонки).
  startTime: now - 5 * 24 * HOUR,
  // Сценарій «прийом ставок ось-ось закриється»:
  // відкрито 25 хв тому, закриється за 6 хв, фіналізація за 30 хв.
  betOpenTime: now - 25 * MINUTE,
  betCloseTime: now + 6 * MINUTE,
  endTime: now + 30 * MINUTE,
  takenByOthers: [64311.98, 70000.0, 59000.0],
  yourTickets: [62002.0, 65500.5],
}

/**
 * Ставки для маркерів на графіку (на правій межі betClose).
 * `mine` — свої (оранжеві), інакше — чужі (червоні).
 */
// Ціни маркерів — близько до живої ціни BTC (~64k), щоб були у видимому діапазоні.
export const mockChartBets: { price: number; mine: boolean }[] = [
  { price: 64150.0, mine: true },
  { price: 63900.0, mine: true },
  { price: 64350.0, mine: false },
  { price: 64050.0, mine: false },
  { price: 63750.0, mine: false },
]

/** Поточна ціна пари BTC/USDT для плашки курсу. */
export const mockCurrencyPrice = '$62,542.47'

/** Статистика гри для верхньої панелі вигляду «Predictions». */
export const mockPredictionStats = {
  reward: '2.4 TON',
  ticketsTaken: '24',
  ticketsMine: '2',
  players: '11',
}

/**
 * Мок-список ставок (20 прогнозів) для вигляду «Predictions».
 * Позначені: ранг 1 — `win` (переможець), ранги 4 та 9 — `mine` (свої ставки).
 */
export const mockBets: Bet[] = [
  { rank: 1, user: '@alice', price: '$62,540.00', variant: 'win' },
  { rank: 2, user: '@bob', price: '$62,212.46', variant: 'default' },
  { rank: 3, user: '@carol', price: '$61,980.10', variant: 'default' },
  { rank: 4, user: '@you', price: '$62,002.00', variant: 'mine' },
  { rank: 5, user: '@dave', price: '$60,750.33', variant: 'default' },
  { rank: 6, user: '@erin', price: '$59,420.88', variant: 'default' },
  { rank: 7, user: '@frank', price: '$58,990.00', variant: 'default' },
  { rank: 8, user: '@grace', price: '$58,300.12', variant: 'default' },
  { rank: 9, user: '@you', price: '$65,500.50', variant: 'mine' },
  { rank: 10, user: '@heidi', price: '$57,800.40', variant: 'default' },
  { rank: 11, user: '@ivan', price: '$57,212.46', variant: 'default' },
  { rank: 12, user: '@judy', price: '$56,900.00', variant: 'default' },
  { rank: 13, user: '@karl', price: '$56,540.77', variant: 'default' },
  { rank: 14, user: '@leo', price: '$55,980.25', variant: 'default' },
  { rank: 15, user: '@mia', price: '$55,400.00', variant: 'default' },
  { rank: 16, user: '@nina', price: '$54,820.60', variant: 'default' },
  { rank: 17, user: '@omar', price: '$54,210.18', variant: 'default' },
  { rank: 18, user: '@pat', price: '$53,700.00', variant: 'default' },
  { rank: 19, user: '@quinn', price: '$53,120.90', variant: 'default' },
  { rank: 20, user: '@rosa', price: '$52,640.45', variant: 'default' },
]

/**
 * Дані для вигляду «Details», згруповані штриховими дивайдерами.
 * Порядок груп зберігається при рендері.
 */
export const mockGameInfo: DetailGroup[] = [
  [
    { label: 'Price prediction date/time', value: 'Jan 1, 10:00' },
    { label: 'Stop receiving predictions', value: 'Dec 31, 00:00' },
    { label: 'Oracle / price source', value: 'binance' },
  ],
  [
    { label: 'Reward', value: '2.4 TON' },
    { label: "Winner's share", value: '1.7 TON' },
    { label: "Organizer's share", value: '0.7 TON' },
    { label: 'Gas', value: '~0.05 TON' },
  ],
  [
    { label: 'Ticket price', value: '0.1 TON' },
    { label: 'Number of participants', value: '16' },
    { label: 'Number of tickets', value: '24' },
  ],
  [{ label: 'Organizer', value: 'User_name' }],
]
