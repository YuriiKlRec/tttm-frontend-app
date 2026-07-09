import { useEffect, useRef, useState, type FC } from 'react'
import { TIMEFRAME_MS, type Candle, type Timeframe } from '../../../services/binance'
import {
  computeInitialRange,
  getPlotRect,
  resolveControllerState,
  selectTimeframe,
  type ChartBet,
  type ChartGame,
  type ChartMode,
  type PriceRange,
} from './chartTypes'
import { drawChart } from './drawChart'
import { ChartOverlays } from './ChartOverlays'
import { useChartIcons } from './useChartIcons'
import { useChartGestures } from './useChartGestures'
import { useLocale } from '../../../i18n/locale'
import { reportChartViewport } from '../../../hooks/useChartData'

/** Пропси інтерактивного графіка ціни. */
interface PriceChartProps {
  /** Історія свічок для поточного (фіксованого — round15) таймфрейму. */
  candles: Candle[]
  /** Жива ціна або null. */
  currentPrice: number | null
  /** Поточний таймфрейм, яким useChartData (у GamePage) завантажив candles. */
  timeframe: Timeframe
  /** Колбек виправлення таймфрейму (round15): PriceChart сам обчислює ОДИН
   * фіксований таймфрейм від тривалості гри (selectTimeframe) і викликає це
   * рівно один раз, якщо він відрізняється від переданого `timeframe` —
   * ніякого перемикання гранулярності при зумі/свайпі більше немає. */
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
  // Чи користувач уже рухав діапазон — щоб не перебивати ручний зум/пан.
  const [touchedRange, setTouchedRange] = useState(false)
  // Чи контролер уже мав реальне значення (тап або зовнішня ціна) — окремо від
  // controllerVisible, бо controllerVisible — це React state (для рендеру),
  // а тут потрібне синхронне читання нижче.
  const [touchedController, setTouchedController] = useState(controllerVisible)

  // Попередній `candles`, з яким уже узгоджено visibleCount/priceRange —
  // стан (не ref), щоб порівняння коректно працювало під StrictMode.
  const [syncedCandles, setSyncedCandles] = useState<Candle[]>(candles)

  if (candles !== syncedCandles) {
    // round15: доклеювання старшої історії (фоновий префетч useChartData при
    // наближенні зуму до краю) дає НОВИЙ масив candles з ТИМ САМИМ хвостом —
    // розпізнаємо це структурно (останній елемент не змінився) і НЕ чіпаємо
    // visibleCount/priceRange: видиме ЧАСОВЕ вікно прив'язане до `now`, а не
    // до індексу масиву, тож рендер не зрушиться (0px) — зростає лише запас
    // candlesLength для майбутнього зуму. Це відрізняється від СПРАВЖНЬОЇ
    // заміни датасету (перший фетч гри / одноразове виправлення таймфрейму —
    // див. ефект нижче), коли треба порахувати дефолтні visibleCount/priceRange
    // синхронно в ТОМУ Ж рендері, що й нові candles (а не в useEffect — інакше
    // конкурентні pointermove-задачі жесту встигають вставити свій commit+paint
    // із ще не узгодженим visibleCount між комітом і запуском ефекту).
    const isSeamlessPrepend =
      syncedCandles.length > 0 &&
      candles.length > syncedCandles.length &&
      candles[candles.length - 1] === syncedCandles[syncedCandles.length - 1]

    setSyncedCandles(candles)

    if (!isSeamlessPrepend && candles.length > 0) {
      const interval = candles.length >= 2 ? candles[1].time - candles[0].time : TIMEFRAME_MS[timeframe]
      const nextVisible = Math.min(candles.length, DEFAULT_VISIBLE)
      setVisibleCount(nextVisible)

      // Діапазон цін — з ВИДИМОГО ЧАСОВОГО вікна (той самий розрахунок, що й
      // сама крива в drawChart.ts — sliceVisibleByTime), а не з усього
      // завантаженого масиву (до 1000 свічок): інакше авто-діапазон ціни
      // рахувався б по місяцях історії замість вікна гри.
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

  // round15: ОДИН фіксований таймфрейм на всю гру, обраний від її тривалості —
  // виправляє зовнішній `timeframe` (стартове значення в GamePage) рівно один
  // раз, якщо він відрізняється від обчисленого. useChartData (де живе symbol)
  // підхопить новий timeframe своїм ефектом на [symbol, timeframe] і перезавантажить
  // candles — жодного подальшого перемикання гранулярності по ходу сесії.
  useEffect(() => {
    const fixed = selectTimeframe(game.endTime - game.startTime)
    if (fixed !== timeframe) {
      onTimeframeChange(fixed)
    }
  }, [game.startTime, game.endTime, timeframe, onTimeframeChange])

  // round15: сигналізує useChartData про наближення видимого вікна до краю
  // завантаженої історії (для фонового префетчу старшої сторінки). Прямого
  // пропс-каналу немає — GamePage/GameContent, де живе useChartData, поза
  // зоною файлів round15 — тож міст reportChartViewport (useChartData.ts).
  useEffect(() => {
    reportChartViewport(visibleCount || candles.length)
  }, [visibleCount, candles.length])

  // Стан контролера (default/mine/others) за близькістю до ставок.
  const { top: plotTop, bottom: plotBottom } = getPlotRect(size.width, size.height)
  const controllerState = resolveControllerState(selectedPrice, bets, priceRange, plotTop, plotBottom)

  useChartGestures({
    ref: canvasRef,
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
    })
  }, [size, candles, visibleCount, currentPrice, priceRange, mode, game, bets, selectedPrice, controllerState, controllerVisible, icons, interactive, locale])

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
