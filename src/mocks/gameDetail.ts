import type { GameDetail } from '../types/game'

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
  betCloseTime: now + 1 * HOUR,
  endTime: now + 10 * HOUR,
  takenByOthers: [64311.98, 70000.0, 59000.0],
  yourTickets: [62002.0, 65500.5],
}
