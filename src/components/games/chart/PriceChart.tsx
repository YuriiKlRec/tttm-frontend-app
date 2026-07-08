import { useEffect, useRef, useState, type FC } from 'react'
import { TIMEFRAME_MS, type Candle, type Timeframe } from '../../../services/binance'
import {
  computeInitialRange,
  getPlotRect,
  resolveControllerState,
  type ChartBet,
  type ChartGame,
  type ChartMode,
  type PriceRange,
} from './chartTypes'
import { drawChart } from './drawChart'
import { ChartOverlays } from './ChartOverlays'
import { useChartIcons } from './useChartIcons'
import { useChartGestures, MIN_VISIBLE } from './useChartGestures'
import { useLocale } from '../../../i18n/locale'

/** Пропси інтерактивного графіка ціни. */
interface PriceChartProps {
  /** Історія свічок для поточного таймфрейму. */
  candles: Candle[]
  /** Жива ціна або null. */
  currentPrice: number | null
  /** Поточний таймфрейм. */
  timeframe: Timeframe
  /** Колбек зміни таймфрейму (горизонтальний свайп). */
  onTimeframeChange: (tf: Timeframe) => void
  /** Геймовий контекст для колонок/маркерів. */
  game: ChartGame
  /** Попередні ставки. */
  bets: ChartBet[]
  /** Виграшний пул (напр. "2.4 TON"). */
  winningPool: string
  /** Колбек вибору ціни Y-контролером. */
  onPriceSelect: (price: number) => void
  /** Зовнішня ціна (з поля ставки) — рухає контролер. */
  externalPrice?: number
  /** Інтерактивний режим: false для завершеної гри (без Y-контролера й Choose). */
  interactive?: boolean
}

/** Дефолтна кількість видимих свічок (вікно зуму при завантаженні). */
const DEFAULT_VISIBLE = 120

/**
 * Свічки у видимому ЧАСОВОМУ вікні — той самий розрахунок (`now - count*interval`
 * .. `now`), що й `drawChart.ts`, а не просто "останні N елементів масиву" (14B):
 * інакше index-зріз, яким рахується авто-діапазон цін, і time-зріз, яким
 * малюється крива, трохи розходяться на межах гранулярності (різна довжина
 * реальної історії за той самий N), що додає зайвий стрибок priceRange саме в
 * момент переходу таймфрейму.
 */
const sliceVisibleByTime = (candles: Candle[], count: number, interval: number): Candle[] => {
  if (candles.length <= count || interval <= 0) {
    return candles
  }
  const now = Date.now()
  const leftTime = now - count * interval
  return candles.filter((c) => c.time >= leftTime && c.time <= now)
}

/** Хук resize-спостереження з DPR-aware розмірами. */
const useElementSize = (
  ref: React.RefObject<HTMLDivElement | null>,
): { width: number; height: number } => {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return size
}

/**
 * Інтерактивний canvas-графік ціни BTC: лінія/свічки, права вісь цін,
 * колонки гри, маркери ставок, лейбл поточної ціни та Y-контролер.
 * High-DPI, резиновий (ResizeObserver), жести — useChartGestures.
 */
export const PriceChart: FC<PriceChartProps> = ({
  candles,
  currentPrice,
  timeframe,
  onTimeframeChange,
  game,
  bets,
  winningPool,
  onPriceSelect,
  externalPrice,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useElementSize(containerRef)
  const icons = useChartIcons()
  const locale = useLocale()

  const [mode, setMode] = useState<ChartMode>('line')
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 1 })
  const [selectedPrice, setSelectedPrice] = useState<number>(0)
  // A1: контролер прихований, доки користувач не поставив його тапом
  // (або доки не прийшла реальна зовнішня ціна — напр. Edit заброньованої ставки).
  const [controllerVisible, setControllerVisible] = useState(
    externalPrice !== undefined && Number.isFinite(externalPrice),
  )
  // Кількість видимих свічок (горизонтальний зум часу).
  const [visibleCount, setVisibleCount] = useState<number>(0)
  // A7: за перемикання таймфрейму (свайп-зум) зберігає видиму ЧАСОВУ тривалість
  // (мс) вікна, щоб після приходу нових даних відновити еквівалентний visibleCount
  // замість дефолтного — інакше вікно різко «стрибає» (1m→5m ×5 свічок замість span).
  // 14B: стан (а не ref) — читається СИНХРОННО в блоці рендеру нижче (офіційний
  // React-патерн «adjusting state when a prop changes», react.dev), а не в
  // useEffect. Спроба з useEffect/useLayoutEffect емпірично НЕ рятує від ривка:
  // ефект (навіть layout) виконується ПІСЛЯ того, як РЕАКТ уже закомітив кадр із
  // новими candles, а конкурентні pointermove-задачі (окремі DOM-події жесту,
  // useChartGestures) встигають примусово вставити СВІЙ commit+paint із своїм
  // (ще не відновленим) visibleCount МІЖ цим комітом і запуском ефекту — виміряно
  // покадровим логом (round14b-report.md): з useLayoutEffect зсув кривої лишався
  // ~900-2300px, з синхронним блоком у рендері — впав до рівня звичайного шуму
  // зуму. Синхронний блок рендеру не лишає такого вікна: він виконується в ТІЙ
  // САМІЙ функції рендеру, що вперше отримує нові candles, до будь-якого коміту.
  const [pendingSpanMs, setPendingSpanMs] = useState<number | null>(null)
  // Чи користувач уже рухав діапазон — щоб не перебивати ручний зум/пан.
  const [touchedRange, setTouchedRange] = useState(false)
  // Чи контролер уже мав реальне значення (тап або зовнішня ціна) — окремо від
  // controllerVisible, бо controllerVisible — це React state (для рендеру),
  // а тут потрібне синхронне читання нижче.
  const [touchedController, setTouchedController] = useState(controllerVisible)

  // 14B: попередній `candles`, з яким уже узгоджено visibleCount/priceRange —
  // стан (не ref), щоб порівняння коректно працювало під StrictMode.
  const [syncedCandles, setSyncedCandles] = useState<Candle[]>(candles)

  // Нова історія (зміна таймфрейму/перезавантаження): visibleCount І priceRange
  // рахуємо СИНХРОННО в ТОМУ Ж рендері, що й новий `candles` (а не в useEffect,
  // як було в 13A) — див. пояснення механізму вище. Покадровим логом
  // (round14b-report.md) підтверджено: неузгоджений «стик» старого
  // visibleCount/priceRange із НОВИМИ candles давав піксельний зсув кривої
  // ~950-1050px (звичайний кадр зуму — 20-90px) — видимий «ривок» на переході
  // таймфрейму.
  if (candles !== syncedCandles) {
    setSyncedCandles(candles)
    if (candles.length > 0) {
      const interval = candles.length >= 2 ? candles[1].time - candles[0].time : TIMEFRAME_MS[timeframe]
      let nextVisible: number
      if (pendingSpanMs !== null) {
        const preserved = Math.round(pendingSpanMs / (interval || 1))
        nextVisible = Math.max(MIN_VISIBLE, Math.min(candles.length, preserved))
        if (import.meta.env.DEV) {
          // Покадровий лог позиції для верифікації A7 (безшовне перемикання таймфрейму).
          console.debug('[chart:A7] viewport restored after timeframe switch', {
            timeframe,
            preservedSpanMs: pendingSpanMs,
            intervalMs: interval,
            visibleCount: nextVisible,
          })
        }
        setPendingSpanMs(null)
      } else {
        nextVisible = Math.min(candles.length, DEFAULT_VISIBLE)
      }
      setVisibleCount(nextVisible)

      // Діапазон цін — з ВИДИМОГО ЧАСОВОГО вікна (той самий розрахунок, що й
      // сама крива в drawChart.ts — sliceVisibleByTime), а не з усього
      // завантаженого масиву (до 500 свічок): інакше на грубшій гранулярності
      // (напр. 1h→4h) той самий масив довжини 500 покриває вже МІСЯЦІ історії
      // замість годин — авто-діапазон ціни різко «роздувається» (виміряно:
      // 61035–64971 → 55796–84854 саме на переході 1h→4h), крива стискається
      // у вузьку смужку — ще одне (не race-based) джерело ривка на переході
      // гранулярності.
      if (!touchedRange) {
        const visibleSlice = sliceVisibleByTime(candles, nextVisible, interval)
        const range = computeInitialRange(visibleSlice, currentPrice)
        setPriceRange(range)
        if (!touchedController) {
          // Внутрішній базовий орієнтир для контролера — НЕ показується (controllerVisible=false),
          // це лише стартова точка на випадок майбутнього drag одразу після першого тапу.
          setSelectedPrice(Number((range.min + (range.max - range.min) * 0.1).toFixed(2)))
        }
      }
    }
  }

  // Живий тік ціни (без зміни candles) — і далі розширює авто-діапазон, поки
  // користувач не зумив вручну. Так само СИНХРОННИЙ блок рендеру (не
  // useEffect) — офіційний React-патерн «adjusting state when a prop
  // changes»: рахунок і setState тут ідентичний до блоку вище, лише
  // тригериться зміною currentPrice, а не candles.
  const [syncedPrice, setSyncedPrice] = useState<number | null>(currentPrice)
  if (currentPrice !== syncedPrice) {
    setSyncedPrice(currentPrice)
    if (candles.length > 0 && !touchedRange) {
      const count = visibleCount || candles.length
      const interval = candles.length >= 2 ? candles[1].time - candles[0].time : TIMEFRAME_MS[timeframe]
      const visibleSlice = sliceVisibleByTime(candles, count, interval)
      const range = computeInitialRange(visibleSlice, currentPrice)
      setPriceRange(range)
      if (!touchedController) {
        setSelectedPrice(Number((range.min + (range.max - range.min) * 0.1).toFixed(2)))
      }
    }
  }

  // Скидаємо ручний зум при зміні таймфрейму (нова шкала) — синхронний блок
  // рендеру замість useEffect (той самий React-патерн «resetting state when a
  // prop changes»).
  const [syncedTimeframe, setSyncedTimeframe] = useState(timeframe)
  if (timeframe !== syncedTimeframe) {
    setSyncedTimeframe(timeframe)
    setTouchedRange(false)
  }

  // Синк зовнішньої ціни (поле ставки → контролер). Звіряємо на однаковій
  // точності (toFixed(2)), щоб 64150 та 64150.00 не зациклювались: при drag
  // контролера onPriceSelect→externalPrice вже дорівнює selectedPrice, тож
  // setSelectedPrice не викликається повторно — цикл заглушено.
  useEffect(() => {
    if (externalPrice === undefined || !Number.isFinite(externalPrice)) {
      return
    }
    if (externalPrice.toFixed(2) === selectedPrice.toFixed(2)) {
      return
    }
    setSelectedPrice(externalPrice)
    setTouchedController(true)
    setControllerVisible(true)
    // Реагуємо лише на externalPrice; selectedPrice читаємо для звірки точності.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrice])

  /** Викликається тапом/драгом контролера (A1: перший тап ставить і показує його). */
  const handlePriceSelect = (price: number): void => {
    setTouchedController(true)
    setControllerVisible(true)
    setSelectedPrice(price)
    onPriceSelect(price)
  }

  const handleSetRange = (next: PriceRange): void => {
    setTouchedRange(true)
    setPriceRange(next)
  }

  /** Обгортка над onTimeframeChange (A7): фіксує поточну видиму тривалість
   * ПЕРЕД перемиканням, щоб блок рендеру вище відновив еквівалентний visibleCount
   * і швидка зміна гранулярності виглядала безшовно, без стрибка вікна. */
  const handleTimeframeChange = (tf: Timeframe): void => {
    if (tf !== timeframe) {
      const interval = candles.length >= 2 ? candles[1].time - candles[0].time : TIMEFRAME_MS[timeframe]
      const count = visibleCount || candles.length || 1
      const span = count * interval
      setPendingSpanMs(span)
      if (import.meta.env.DEV) {
        console.debug('[chart:A7] timeframe switch requested', {
          from: timeframe,
          to: tf,
          visibleCountBefore: count,
          intervalMsBefore: interval,
          preservedSpanMs: span,
        })
      }
    }
    onTimeframeChange(tf)
  }

  // Стан контролера (default/mine/others) за близькістю до ставок.
  const { top: plotTop, bottom: plotBottom } = getPlotRect(size.width, size.height)
  const controllerState = resolveControllerState(selectedPrice, bets, priceRange, plotTop, plotBottom)

  useChartGestures({
    ref: canvasRef,
    timeframe,
    onTimeframeChange: handleTimeframeChange,
    priceRange,
    setPriceRange: handleSetRange,
    selectedPrice,
    setSelectedPrice: handlePriceSelect,
    visibleCount,
    setVisibleCount,
    candlesLength: candles.length,
    bets,
    size,
    interactive,
    controllerVisible,
  })

  // Малювання у DPR-масштабованому контексті при зміні стану/розміру.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width === 0 || size.height === 0) {
      return
    }
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size.width * dpr)
    canvas.height = Math.round(size.height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawChart(ctx, {
      width: size.width,
      height: size.height,
      candles,
      visibleCount,
      currentPrice,
      priceRange,
      mode,
      game,
      bets,
      selectedPrice,
      controllerState,
      controllerVisible,
      icons,
      interactive,
      locale,
      timeframe,
    })
  }, [size, candles, visibleCount, currentPrice, priceRange, mode, game, bets, selectedPrice, controllerState, controllerVisible, icons, interactive, locale, timeframe])

  const loading = candles.length === 0

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[300px] w-full touch-none overflow-hidden bg-background"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {loading && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[14px] text-text-secondary">
          Loading…
        </p>
      )}
      {!loading && size.width > 0 && (
        <ChartOverlays
          winningPool={winningPool}
          mode={mode}
          onToggleMode={() => setMode((m) => (m === 'line' ? 'candles' : 'line'))}
          selectedPrice={selectedPrice}
          controllerState={controllerState}
          priceRange={priceRange}
          size={size}
          interactive={interactive}
          controllerVisible={controllerVisible}
        />
      )}
    </div>
  )
}
