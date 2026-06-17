import type { Game } from '../types/game'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Базова точка відліку для відносних часів моків. */
const now = Date.now()

/**
 * Мок-набір ігор з різними станами таймлайну відносно `now`,
 * щоб побачити різні частки сірий/оранжевий/білий та різний відлік.
 */
export const mockGames: Game[] = [
  // 1) Стартувала щойно, ставки відкриті майже весь час: великий оранжевий сегмент.
  {
    id: 'btc-70k',
    title: 'BTC above 70k?',
    author: 'User_name',
    ticketPrice: '0.1',
    prize: '2.4',
    ticketsCount: 3,
    startTime: now - 2 * MINUTE,
    betCloseTime: now + 3 * HOUR,
    endTime: now + 4 * HOUR,
    isAuthor: true,
  },
  // 2) Стартувала давно, ставки ще відкриті трохи: малий оранжевий, великий сірий.
  {
    id: 'eth-4k',
    title: 'ETH flips 4k',
    author: 'satoshi_jr',
    ticketPrice: '0.25',
    prize: '8.1',
    ticketsCount: 0,
    startTime: now - 5 * HOUR,
    betCloseTime: now + 12 * MINUTE,
    endTime: now + 1 * HOUR,
  },
  // 3) Ставки вже закрились: оранжевого нема, є сірий + білий.
  {
    id: 'ton-moon',
    title: 'TON to the moon',
    author: 'durov_fan',
    ticketPrice: '0.5',
    prize: '15.0',
    ticketsCount: 7,
    startTime: now - 3 * HOUR,
    betCloseTime: now - 30 * MINUTE,
    endTime: now + 2 * HOUR,
    isAuthor: true,
  },
  // 4) Майже завершилась: великий сірий, малий білий.
  {
    id: 'sol-outperforms',
    title: 'SOL outperforms',
    author: 'degen_max',
    ticketPrice: '0.05',
    prize: '1.2',
    ticketsCount: 1,
    startTime: now - 9 * HOUR,
    betCloseTime: now - 4 * HOUR,
    endTime: now + 20 * MINUTE,
  },
  // 5) Середина: ставки відкриті, приблизно половина пройдена.
  {
    id: 'daily-green',
    title: 'Daily green close',
    author: 'hodler_99',
    ticketPrice: '0.2',
    prize: '5.6',
    ticketsCount: 0,
    startTime: now - 2 * HOUR,
    betCloseTime: now + 1 * HOUR,
    endTime: now + 2 * HOUR,
  },
]
