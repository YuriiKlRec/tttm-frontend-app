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

/** Підтримувані таймфрейми (від детального до грубого) для свайп-зуму. */
export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const

/** Тип одного таймфрейму. */
export type Timeframe = (typeof TIMEFRAMES)[number]

/** Тривалість одного таймфрейму в мілісекундах — для перерахунку видимого
 * вікна (кількість свічок) при перемиканні гранулярності без стрибка (A7). */
export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
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
 * @throws Error при HTTP-помилці або некоректній відповіді
 */
export const fetchKlines = async (
  symbol: string,
  interval: string,
  limit: number,
): Promise<Candle[]> => {
  const url = `${REST_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`

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
