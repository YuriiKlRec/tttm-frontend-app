import { useEffect, useRef, useState, type FC } from 'react'
import type { Candle, Timeframe } from '../../../services/binance'
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
import { useChartGestures } from './useChartGestures'

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

  const [mode, setMode] = useState<ChartMode>('line')
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 1 })
  const [selectedPrice, setSelectedPrice] = useState<number>(0)
  // Кількість видимих свічок (горизонтальний зум часу).
  const [visibleCount, setVisibleCount] = useState<number>(0)

  // Нова історія (зміна таймфрейму/перезавантаження) — дефолтне вікно зуму,
  // щоб вікно ставок (хвилини) було видно поряд з історією.
  useEffect(() => {
    setVisibleCount(Math.min(candles.length, DEFAULT_VISIBLE))
  }, [candles])
  // Чи користувач уже рухав діапазон/контролер — щоб не перебивати ручні дії.
  const touchedRange = useRef(false)
  const touchedController = useRef(false)

  // Перерахунок діапазону при новій історії (поки користувач не зумив вручну).
  useEffect(() => {
    if (candles.length === 0 || touchedRange.current) {
      return
    }
    const range = computeInitialRange(candles, currentPrice)
    setPriceRange(range)
    if (!touchedController.current) {
      // Контролер спершу внизу.
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
    // Реагуємо лише на externalPrice; selectedPrice читаємо для звірки точності.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrice])

  const handlePriceSelect = (price: number): void => {
    touchedController.current = true
    setSelectedPrice(price)
    onPriceSelect(price)
  }

  const handleSetRange = (next: PriceRange): void => {
    touchedRange.current = true
    setPriceRange(next)
  }

  // Стан контролера (default/mine/others) за близькістю до ставок.
  const { top: plotTop, bottom: plotBottom } = getPlotRect(size.width, size.height)
  const controllerState = resolveControllerState(selectedPrice, bets, priceRange, plotTop, plotBottom)

  useChartGestures({
    ref: canvasRef,
    timeframe,
    onTimeframeChange,
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
      icons,
      interactive,
    })
  }, [size, candles, visibleCount, currentPrice, priceRange, mode, game, bets, selectedPrice, controllerState, icons, interactive])

  const loading = candles.length === 0

  return (
    <div ref={containerRef} className="relative h-full w-full touch-none overflow-hidden bg-background">
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
        />
      )}
    </div>
  )
}
