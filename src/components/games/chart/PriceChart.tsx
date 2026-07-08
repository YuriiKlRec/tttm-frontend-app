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
  const pendingSpanMs = useRef<number | null>(null)

  // Нова історія (зміна таймфрейму/перезавантаження) — дефолтне вікно зуму,
  // щоб вікно ставок (хвилини) було видно поряд з історією. Якщо це перехід
  // після свайп-перемикання таймфрейму (pendingSpanMs) — відновлюємо еквівалентний
  // видимий діапазон замість скидання, щоб не було стрибка (A7).
  useEffect(() => {
    if (candles.length === 0) {
      return
    }
    if (pendingSpanMs.current !== null) {
      const interval = candles.length >= 2 ? candles[1].time - candles[0].time : TIMEFRAME_MS[timeframe]
      const preserved = Math.round(pendingSpanMs.current / (interval || 1))
      const next = Math.max(MIN_VISIBLE, Math.min(candles.length, preserved))
      if (import.meta.env.DEV) {
        // Покадровий лог позиції для верифікації A7 (безшовне перемикання таймфрейму).
        console.debug('[chart:A7] viewport restored after timeframe switch', {
          timeframe,
          preservedSpanMs: pendingSpanMs.current,
          intervalMs: interval,
          visibleCount: next,
        })
      }
      setVisibleCount(next)
      pendingSpanMs.current = null
      return
    }
    setVisibleCount(Math.min(candles.length, DEFAULT_VISIBLE))
    // Залежність навмисно лише [candles] (без timeframe): PriceChart — нащадок
    // GamePage, тож цей ефект комітиться РАНІШЕ за ефект useChartData, який
    // власне міняє candles. Якби ефект залежав і від timeframe, він спрацював
    // би одразу на зміну timeframe (ще зі СТАРИМИ candles/interval минулого
    // таймфрейму) і передчасно «спожив» би pendingSpanMs неправильним
    // інтервалом — вікно відновилося б один кадр із хибним числом, а тоді
    // мовчки перескочило на DEFAULT_VISIBLE, коли реальні дані нарешті
    // прийдуть (видимий «стрибок», якого A7 і мав позбутися). Читаємо
    // timeframe із замикання лише як фолбек-інтервал для <2 свічок.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles])
  // Чи користувач уже рухав діапазон — щоб не перебивати ручний зум/пан.
  const touchedRange = useRef(false)
  // Чи контролер уже мав реальне значення (тап або зовнішня ціна) — окремо від
  // controllerVisible, бо controllerVisible — це React state (для рендеру),
  // а тут потрібне синхронне читання в тому ж ефекті нижче.
  const touchedController = useRef(controllerVisible)

  // Перерахунок діапазону при новій історії (поки користувач не зумив вручну).
  useEffect(() => {
    if (candles.length === 0 || touchedRange.current) {
      return
    }
    const range = computeInitialRange(candles, currentPrice)
    setPriceRange(range)
    if (!touchedController.current) {
      // Внутрішній базовий орієнтир для контролера — НЕ показується (controllerVisible=false),
      // це лише стартова точка на випадок майбутнього drag одразу після першого тапу.
      setSelectedPrice(Number((range.min + (range.max - range.min) * 0.1).toFixed(2)))
    }
  }, [candles, currentPrice])

  // Скидаємо ручний зум при зміні таймфрейму (нова шкала).
  useEffect(() => {
    touchedRange.current = false
  }, [timeframe])

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
    touchedController.current = true
    setControllerVisible(true)
    // Реагуємо лише на externalPrice; selectedPrice читаємо для звірки точності.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrice])

  /** Викликається тапом/драгом контролера (A1: перший тап ставить і показує його). */
  const handlePriceSelect = (price: number): void => {
    touchedController.current = true
    setControllerVisible(true)
    setSelectedPrice(price)
    onPriceSelect(price)
  }

  const handleSetRange = (next: PriceRange): void => {
    touchedRange.current = true
    setPriceRange(next)
  }

  /** Обгортка над onTimeframeChange (A7): фіксує поточну видиму тривалість
   * ПЕРЕД перемиканням, щоб ефект вище відновив еквівалентний visibleCount
   * і швидка зміна гранулярності виглядала безшовно, без стрибка вікна. */
  const handleTimeframeChange = (tf: Timeframe): void => {
    if (tf !== timeframe) {
      const interval = candles.length >= 2 ? candles[1].time - candles[0].time : TIMEFRAME_MS[timeframe]
      const count = visibleCount || candles.length || 1
      pendingSpanMs.current = count * interval
      if (import.meta.env.DEV) {
        console.debug('[chart:A7] timeframe switch requested', {
          from: timeframe,
          to: tf,
          visibleCountBefore: count,
          intervalMsBefore: interval,
          preservedSpanMs: pendingSpanMs.current,
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
