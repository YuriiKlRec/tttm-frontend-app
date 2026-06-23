import { useEffect, useRef, useState } from 'react'
import { fetchKlines, subscribeTradePrice, type Candle, type Timeframe } from '../services/binance'

/** Результат хука даних графіка. */
interface UseChartDataResult {
  /** Свічки історії для поточного таймфрейму. */
  candles: Candle[]
  /** Жива ціна або null. */
  currentPrice: number | null
}

/** Кількість свічок історії на запит (запас для горизонтального зуму). */
const KLINES_LIMIT = 500

/** Період застосування живої ціни (мс): тротлить потік угод Binance. */
const PRICE_FLUSH_MS = 250

/**
 * Завантажує історію свічок при зміні таймфрейму та підписується на живу
 * ціну через WebSocket. Чистить підписку при розмонтуванні.
 * @param symbol торгова пара, напр. "BTCUSDT"
 * @param timeframe інтервал Binance
 */
export const useChartData = (symbol: string, timeframe: Timeframe): UseChartDataResult => {
  const [candles, setCandles] = useState<Candle[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const requestId = useRef(0)
  // Остання отримана ціна (накопичується між тротл-флешами).
  const latestPrice = useRef<number | null>(null)

  // Історія свічок при зміні таймфрейму.
  useEffect(() => {
    const id = ++requestId.current
    fetchKlines(symbol, timeframe, KLINES_LIMIT)
      .then((data) => {
        if (id === requestId.current) {
          setCandles(data)
        }
      })
      .catch((error) => {
        console.error('Chart history load failed:', error)
        if (id === requestId.current) {
          setCandles([])
        }
      })
    // Скидаємо попередню історію (заглушка "Loading…") на час нового запиту.
    return () => setCandles([])
  }, [symbol, timeframe])

  // Жива ціна: потік угод накопичуємо у ref, а в state застосовуємо лише раз на
  // PRICE_FLUSH_MS — інакше десятки угод/сек спричиняли б стільки ж
  // перемальовувань canvas і високе навантаження на CPU.
  useEffect(() => {
    const unsubscribe = subscribeTradePrice(symbol, (price) => {
      latestPrice.current = price
    })
    const flush = window.setInterval(() => {
      const next = latestPrice.current
      if (next !== null) {
        setCurrentPrice((prev) => (prev === next ? prev : next))
      }
    }, PRICE_FLUSH_MS)
    return () => {
      unsubscribe()
      window.clearInterval(flush)
    }
  }, [symbol])

  return { candles, currentPrice }
}
