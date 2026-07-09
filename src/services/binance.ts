/**
 * Сервіс даних Binance: REST для історії свічок (klines) та WebSocket для
 * живої ціни угод (trade stream). Уся мережева логіка графіка ізольована тут —
 * UI-компоненти не звертаються до fetch напряму.
 */

/** Одна свічка OHLC з часом відкриття (epoch ms). */
export interface Candle {
  /** Час відкриття свічки (epoch ms). */
  time: number
  /** Ціна відкриття. */
  open: number
  /** Максимум. */
  high: number
  /** Мінімум. */
  low: number
  /** Ціна закриття. */
  close: number
}

/** Таймфрейми, з яких обирається ОДИН фіксований на всю гру (round15) —
 * від детального до грубого. Ніякого перемикання під час зуму/свайпу:
 * вибір відбувається один раз від тривалості гри (chartTypes.selectTimeframe). */
export const TIMEFRAMES = ['1m', '5m', '30m', '1h'] as const

/** Тип одного таймфрейму. */
export type Timeframe = (typeof TIMEFRAMES)[number]

/** Тривалість одного таймфрейму в мілісекундах — для розрахунку інтервалу
 * між свічками, коли їх завантажено < 2. */
export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
}

/** Базовий REST-ендпоінт Binance. */
const REST_BASE = 'https://api.binance.com/api/v3'

/** Базовий WebSocket-ендпоінт Binance. */
const WS_BASE = 'wss://stream.binance.com:9443/ws'

/** Сирий формат свічки Binance: [openTime, o, h, l, c, ...]. */
type RawKline = [number, string, string, string, string, ...unknown[]]

/**
 * Завантажує історію свічок для символу й інтервалу.
 * @param symbol торгова пара, напр. "BTCUSDT"
 * @param interval інтервал Binance, напр. "15m"
 * @param limit кількість свічок (макс. 1000)
 * @param endTime якщо задано — повертає `limit` свічок ДО цього моменту
 *   (epoch ms, включно): використовується для фонового префетчу старшої
 *   сторінки історії (round15) — `endTime = найстаріша_завантажена.time - 1`.
 * @throws Error при HTTP-помилці або некоректній відповіді
 */
export const fetchKlines = async (
  symbol: string,
  interval: string,
  limit: number,
  endTime?: number,
): Promise<Candle[]> => {
  const params = new URLSearchParams({ symbol, interval, limit: String(limit) })
  if (endTime !== undefined) {
    params.set('endTime', String(endTime))
  }
  const url = `${REST_BASE}/klines?${params.toString()}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Binance klines error: ${response.status}`)
  }

  const raw = (await response.json()) as RawKline[]
  if (!Array.isArray(raw)) {
    throw new Error('Binance klines: unexpected response shape')
  }

  return raw.map((candle) => ({
    time: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
  }))
}

/** Повідомлення trade-стріму Binance (нас цікавить лише поле `p`). */
interface TradeMessage {
  /** Ціна угоди (рядок). */
  p?: string
}

/**
 * Підписка на живу ціну угод через WebSocket Binance.
 * Автоматично перепідключається при розриві (окрім ручного закриття).
 * @param symbol торгова пара, напр. "BTCUSDT"
 * @param onPrice колбек з новою ціною
 * @returns функція відписки — закриває сокет і зупиняє reconnect
 */
export const subscribeTradePrice = (
  symbol: string,
  onPrice: (price: number) => void,
): (() => void) => {
  const stream = `${WS_BASE}/${symbol.toLowerCase()}@trade`
  let socket: WebSocket | null = null
  let reconnectTimer: number | undefined
  let closedByUser = false

  const connect = (): void => {
    socket = new WebSocket(stream)

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as TradeMessage
        if (data.p !== undefined) {
          const price = parseFloat(data.p)
          if (Number.isFinite(price)) {
            onPrice(price)
          }
        }
      } catch (error) {
        console.error('Binance trade parse error:', error)
      }
    }

    socket.onclose = () => {
      if (closedByUser) {
        return
      }
      // Чистий reconnect через 1.5с
      reconnectTimer = window.setTimeout(connect, 1500)
    }

    socket.onerror = () => {
      // Закриваємо — onclose ініціює reconnect
      socket?.close()
    }
  }

  connect()

  return () => {
    closedByUser = true
    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer)
    }
    socket?.close()
    socket = null
  }
}
