import { useEffect, useRef, useState } from 'react'
import {
  fetchKlines,
  subscribeTradePrice,
  TIMEFRAMES,
  type Candle,
  type Timeframe,
} from '../services/binance'

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
 *
 * Кешує історію по кожному таймфрейму символу і передзавантажує решту
 * таймфреймів у фоні (як bitcoin-price-widget: `fetchAllOHLCTimeranges`) —
 * перемикання гранулярності при горизонтальному свайпі (A7) бере готові дані
 * з кешу миттєво, ОДНИМ `setCandles` (без повторного фетчу того самого
 * таймфрейму — інакше другий сеттер одразу після switch спричинив би зайвий
 * скид вікна зуму в PriceChart), без порожнього "Loading…" і без стрибка:
 * на кеш-міс `candles` НЕ скидається в [] — попередній таймфрейм лишається
 * на екрані, поки фетч не підмінить дані.
 *
 * @param symbol торгова пара, напр. "BTCUSDT"
 * @param timeframe інтервал Binance
 */
export const useChartData = (symbol: string, timeframe: Timeframe): UseChartDataResult => {
  const [candles, setCandles] = useState<Candle[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const requestId = useRef(0)
  // Остання отримана ціна (накопичується між тротл-флешами).
  const latestPrice = useRef<number | null>(null)
  // Кеш історії по таймфрейму для ПОТОЧНОГО символу.
  const cache = useRef<Map<Timeframe, Candle[]>>(new Map())
  const cachedSymbol = useRef<string>(symbol)

  // Новий символ (нова гра/пара) — стара кешована історія невалідна.
  useEffect(() => {
    if (cachedSymbol.current !== symbol) {
      cache.current.clear()
      cachedSymbol.current = symbol
    }
  }, [symbol])

  // Історія активного таймфрейму: з кешу — миттєво і БЕЗ повторного фетчу
  // (щоб не було другого `setCandles` одразу після безшовного switch, який
  // спричинив би зайвий скид вікна зуму в PriceChart). Кеш-міс — звичайний
  // фетч, попередні `candles` НЕ скидаються в [] на час запиту (той самий
  // таймфрейм і далі показує свої дані до заміни).
  useEffect(() => {
    const cached = cache.current.get(timeframe)
    if (cached) {
      setCandles(cached)
      return
    }
    const id = ++requestId.current
    fetchKlines(symbol, timeframe, KLINES_LIMIT)
      .then((data) => {
        if (id !== requestId.current) {
          return
        }
        cache.current.set(timeframe, data)
        setCandles(data)
      })
      .catch((error) => {
        console.error('Chart history load failed:', error)
        if (id === requestId.current) {
          setCandles([])
        }
      })
  }, [symbol, timeframe])

  // Фонове передзавантаження РЕШТИ таймфреймів того ж символу — щоб
  // авто-перемикання гранулярності при зумі (useChartGestures.shiftTimeframe)
  // майже завжди влучало в теплий кеш і не чекало мережі.
  useEffect(() => {
    let cancelled = false
    TIMEFRAMES.forEach((tf) => {
      if (cache.current.has(tf)) {
        return
      }
      fetchKlines(symbol, tf, KLINES_LIMIT)
        .then((data) => {
          if (cancelled) {
            return
          }
          cache.current.set(tf, data)
        })
        .catch(() => {
          // Тихо ігноруємо — це лише прогрів кешу; активний таймфрейм має
          // власний фетч (з retry на наступному switch) у ефекті вище.
        })
    })
    return () => {
      cancelled = true
    }
  }, [symbol])

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
