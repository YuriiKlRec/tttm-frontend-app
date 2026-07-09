import { useEffect, useRef, useState } from 'react'
import { fetchKlines, subscribeTradePrice, type Candle, type Timeframe } from '../services/binance'

/** Результат хука даних графіка. */
interface UseChartDataResult {
  /** Свічки історії для поточного таймфрейму. */
  candles: Candle[]
  /** Жива ціна або null. */
  currentPrice: number | null
}

/** Перший фетч історії — великий шмат (round15, п.2 брифу), щоб типові
 * свайпи-зуми в минуле не чекали мережі. 1000 — максимум, який Binance REST
 * klines віддає за один запит. */
const INITIAL_KLINES_LIMIT = 1000

/** Розмір однієї сторінки фонового префетчу старшої історії (round15, п.3) —
 * менший за перший фетч, щоб окремий доклеювальний запит лишався легким. */
const PREFETCH_PAGE_LIMIT = 500

/** Поріг наближення до найстарішої завантаженої свічки (у кількості свічок
 * запасу), за яким стартує фоновий префетч наступної сторінки — приблизно
 * 1-2 "екрани" видимого вікна за замовчуванням (DEFAULT_VISIBLE=120 у
 * PriceChart.tsx). */
const PREFETCH_MARGIN = 240

/** Період застосування живої ціни (мс): тротлить потік угод Binance. */
const PRICE_FLUSH_MS = 250

/**
 * Міст сигналу "видиме вікно наближається до краю історії" між PriceChart
 * (де живе visibleCount — стан зуму) і цим хуком (де живе symbol/timeframe і
 * мережевий фетч): пряме прокидання пропсами тут неможливе — спільний рівень
 * дерева (GamePage/GameContent) поза зоною файлів round15. reportChartViewport
 * викликається з PriceChart при кожній зміні видимого вікна; хук підписується
 * через мутований реф на час свого життя — без зайвих ре-рендерів жодної зі
 * сторін мосту.
 */
type ViewportHandler = (visibleCount: number) => void
let viewportHandler: ViewportHandler | null = null

/** Сигналізує хуку про поточну кількість видимих свічок (див. коментар вище). */
export const reportChartViewport = (visibleCount: number): void => {
  viewportHandler?.(visibleCount)
}

/**
 * Завантажує історію свічок ОДНОГО фіксованого таймфрейму гри (обирається в
 * PriceChart від тривалості гри — chartTypes.selectTimeframe, round15) та
 * підписується на живу ціну через WebSocket. Чистить підписку при
 * розмонтуванні.
 *
 * Стратегія даних (round15, замінює мульти-таймфрейм-кеш 13A/14B):
 * 1. Один великий перший фетч (до 1000 свічок) при зміні symbol/timeframe —
 *    попередні candles НЕ скидаються в [] на час запиту, стара крива лишається
 *    на екрані до заміни (без порожнього "Loading…" при повторному фетчі).
 * 2. Фоновий префетч старшої сторінки, коли видиме вікно наближається до
 *    найстарішої завантаженої свічки (сигнал — reportChartViewport):
 *    доклеюється на початок масиву БЕЗ лоадера й без скидання visibleCount —
 *    сам масив зростає, а видиме вікно (прив'язане до часу, не до індексу)
 *    лишається на місці (0px зсув, PriceChart.tsx розпізнає доклеювання
 *    структурно — той самий хвіст масиву).
 *
 * @param symbol торгова пара, напр. "BTCUSDT"
 * @param timeframe фіксований таймфрейм гри
 */
export const useChartData = (symbol: string, timeframe: Timeframe): UseChartDataResult => {
  const [candles, setCandles] = useState<Candle[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const requestId = useRef(0)
  // Остання отримана ціна (накопичується між тротл-флешами).
  const latestPrice = useRef<number | null>(null)
  // Завжди свіжий знімок candles для колбеків поза React-рендером (fetch-колбеки, міст).
  const candlesRef = useRef<Candle[]>(candles)
  useEffect(() => {
    candlesRef.current = candles
  }, [candles])
  // In-flight guard префетчу старшої сторінки — уникає дубль-фетчів (п.3 брифу).
  const loadingOlder = useRef(false)
  // true, коли Binance повернула порожню сторінку — початок історії символу досягнуто.
  const exhausted = useRef(false)

  // Великий перший фетч історії при зміні символу/таймфрейму.
  useEffect(() => {
    const id = ++requestId.current
    exhausted.current = false
    fetchKlines(symbol, timeframe, INITIAL_KLINES_LIMIT)
      .then((data) => {
        if (id !== requestId.current) {
          return
        }
        setCandles(data)
      })
      .catch((error) => {
        console.error('Chart history load failed:', error)
        if (id === requestId.current) {
          setCandles([])
        }
      })
  }, [symbol, timeframe])

  // Фоновий префетч старшої історії на сигнал наближення до краю (міст із PriceChart).
  useEffect(() => {
    const loadOlderPage = (): void => {
      if (loadingOlder.current || exhausted.current) {
        return
      }
      const current = candlesRef.current
      if (current.length === 0) {
        return
      }
      const oldest = current[0].time
      const id = requestId.current
      loadingOlder.current = true
      fetchKlines(symbol, timeframe, PREFETCH_PAGE_LIMIT, oldest - 1)
        .then((older) => {
          if (id !== requestId.current) {
            return
          }
          if (older.length === 0) {
            exhausted.current = true
            return
          }
          // Доклеюємо лише якщо база не змінилась між стартом і відповіддю запиту
          // (уникає дублів/розривів при рідкісному перегоні з іншим префетчем).
          setCandles((prev) => (prev.length > 0 && prev[0].time === oldest ? [...older, ...prev] : prev))
        })
        .catch(() => {
          // Тихо ігноруємо — наступне наближення до краю спробує ще раз.
        })
        .finally(() => {
          loadingOlder.current = false
        })
    }

    viewportHandler = (visibleCount: number): void => {
      const total = candlesRef.current.length
      if (total === 0) {
        return
      }
      const remaining = total - visibleCount
      if (remaining <= PREFETCH_MARGIN) {
        loadOlderPage()
      }
    }
    return () => {
      viewportHandler = null
    }
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
