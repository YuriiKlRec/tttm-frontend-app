import { useEffect, useRef } from 'react'
import { TIMEFRAMES, type Timeframe } from '../../../services/binance'
import {
  AXIS_WIDTH,
  getPlotRect,
  yToPrice,
  priceToY,
  snapToOwnBet,
  type ChartBet,
  type PriceRange,
} from './chartTypes'

/** Вхідні параметри керування жестами графіка. */
interface UseChartGesturesArgs {
  /** Елемент-ціль pointer-подій (canvas) — щоб кліки оверлеїв-кнопок не крались. */
  ref: React.RefObject<HTMLElement | null>
  /** Поточний таймфрейм. */
  timeframe: Timeframe
  /** Колбек зміни таймфрейму (горизонтальний свайп). */
  onTimeframeChange: (tf: Timeframe) => void
  /** Поточний діапазон цін (для зуму/пану по осі). */
  priceRange: PriceRange
  /** Оновлення діапазону цін. */
  setPriceRange: (next: PriceRange) => void
  /** Вибрана ціна Y-контролера. */
  selectedPrice: number
  /** Оновлення вибраної ціни. */
  setSelectedPrice: (price: number) => void
  /** Кількість видимих свічок (горизонтальний зум часу). */
  visibleCount: number
  /** Оновлення кількості видимих свічок. */
  setVisibleCount: (count: number) => void
  /** Загальна кількість завантажених свічок. */
  candlesLength: number
  /** Ставки (для магніту контролера до своїх). */
  bets: ChartBet[]
  /** Поточні розміри області (CSS px). */
  size: { width: number; height: number }
  /** Інтерактивний режим: false вимикає перетягування Y-контролера (zoom/scroll лишаються). */
  interactive: boolean
}

/** Поріг (px) для визначення домінантної осі та активації свайпу. */
const AXIS_DOMINANCE = 8

/** Мінімум видимих свічок при зумі. */
const MIN_VISIBLE = 12

/** Скільки свічок змінює 1px горизонтального драгу. */
const XZOOM_PER_PX = 0.7

/** Зсуває таймфрейм: dir<0 (свайп вліво) — детальніший, dir>0 — довший. */
const shiftTimeframe = (current: Timeframe, dir: number): Timeframe => {
  const idx = TIMEFRAMES.indexOf(current)
  const next = Math.min(TIMEFRAMES.length - 1, Math.max(0, idx + (dir > 0 ? 1 : -1)))
  return TIMEFRAMES[next]
}

/** Тип активного жесту. */
type GestureKind = 'none' | 'undecided' | 'timeframe' | 'controller' | 'axisPan'

/**
 * Керування жестами графіка через pointer events (миша + тач):
 * 1. Горизонтальний драг по тілу → зміна таймфрейму.
 * 2. Вертикальний драг по тілу або по Y-контролеру → рух контролера.
 * 3. На правій осі цін: вертик. драг → пан по ціні, pinch / wheel → зум Y.
 * Конфлікти розводяться зоною старту (вісь vs тіло) та домінантною віссю.
 */
export const useChartGestures = ({
  ref,
  timeframe,
  onTimeframeChange,
  priceRange,
  setPriceRange,
  selectedPrice,
  setSelectedPrice,
  visibleCount,
  setVisibleCount,
  candlesLength,
  bets,
  size,
  interactive,
}: UseChartGesturesArgs): void => {
  // Свіжі значення в ref, щоб слухачі не перевішувались щокадру.
  const state = useRef({
    timeframe,
    priceRange,
    selectedPrice,
    visibleCount,
    candlesLength,
    bets,
    size,
    interactive,
    onTimeframeChange,
    setPriceRange,
    setSelectedPrice,
    setVisibleCount,
  })
  useEffect(() => {
    state.current = {
      timeframe,
      priceRange,
      selectedPrice,
      visibleCount,
      candlesLength,
      bets,
      size,
      interactive,
      onTimeframeChange,
      setPriceRange,
      setSelectedPrice,
      setVisibleCount,
    }
  })

  // Активні вказівники для pinch.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const gesture = useRef<{
    kind: GestureKind
    startX: number
    startY: number
    onAxis: boolean
    pinchDist: number
    pinchCenterY: number
    tfFired: boolean
    startVisible: number
  }>({
    kind: 'none',
    startX: 0,
    startY: 0,
    onAxis: false,
    pinchDist: 0,
    pinchCenterY: 0,
    tfFired: false,
    startVisible: 0,
  })

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }

    /** Чи близько до лінії контролера за поточної ціни (лише в інтерактивному режимі). */
    const nearController = (y: number): boolean => {
      if (!state.current.interactive) {
        return false
      }
      const { width, height } = state.current.size
      const { top, bottom } = getPlotRect(width, height)
      const cy = priceToY(state.current.selectedPrice, state.current.priceRange, top, bottom)
      return Math.abs(y - cy) < 16
    }

    /** Оновлює ціну контролера за Y-пікселем; магнітиться до своїх ставок. */
    const moveController = (y: number): void => {
      const { width, height } = state.current.size
      const { top, bottom } = getPlotRect(width, height)
      const clampedY = Math.min(bottom, Math.max(top, y))
      const range = state.current.priceRange
      const snapped = snapToOwnBet(clampedY, state.current.bets, range, top, bottom)
      const price = snapped ?? yToPrice(clampedY, range, top, bottom)
      state.current.setSelectedPrice(Number(price.toFixed(2)))
    }

    /** Зум по ціні навколо опорного Y (для wheel/pinch). */
    const zoomPrice = (factor: number, centerY: number): void => {
      const { width, height } = state.current.size
      const { top, bottom } = getPlotRect(width, height)
      const range = state.current.priceRange
      const center = yToPrice(centerY, range, top, bottom)
      const newMin = center - (center - range.min) * factor
      const newMax = center + (range.max - center) * factor
      if (newMax - newMin > 0.01) {
        state.current.setPriceRange({ min: newMin, max: newMax })
      }
    }

    /** Пан по ціні на dY пікселів. */
    const panPrice = (dy: number): void => {
      const { width, height } = state.current.size
      const { top, bottom } = getPlotRect(width, height)
      const range = state.current.priceRange
      const span = range.max - range.min
      const delta = (dy / (bottom - top || 1)) * span
      state.current.setPriceRange({ min: range.min + delta, max: range.max + delta })
    }

    /** Горизонтальний зум часу: кламп кількості видимих свічок. */
    const applyXZoom = (count: number): void => {
      const max = state.current.candlesLength || count
      const clamped = Math.round(Math.min(max, Math.max(MIN_VISIBLE, count)))
      state.current.setVisibleCount(clamped)
    }

    const onPointerDown = (e: PointerEvent): void => {
      el.setPointerCapture(e.pointerId)
      pointers.current.set(e.pointerId, { x: e.offsetX, y: e.offsetY })

      const onAxis = e.offsetX > state.current.size.width - AXIS_WIDTH

      if (pointers.current.size === 2) {
        // Старт pinch.
        const pts = [...pointers.current.values()]
        const dx = pts[0].x - pts[1].x
        const dy = pts[0].y - pts[1].y
        gesture.current.kind = 'axisPan'
        gesture.current.pinchDist = Math.hypot(dx, dy)
        gesture.current.pinchCenterY = (pts[0].y + pts[1].y) / 2
        return
      }

      // Пріоритет контролеру: якщо натиск біля його лінії (за Y) — рухаємо лише його,
      // навіть коли це над віссю цін (бокс значення лежить поверх цін).
      gesture.current = {
        kind: nearController(e.offsetY) ? 'controller' : onAxis ? 'axisPan' : 'undecided',
        startX: e.offsetX,
        startY: e.offsetY,
        onAxis,
        pinchDist: 0,
        pinchCenterY: e.offsetY,
        tfFired: false,
        startVisible: state.current.visibleCount || state.current.candlesLength,
      }
      if (gesture.current.kind === 'controller') {
        moveController(e.offsetY)
      }
    }

    const onPointerMove = (e: PointerEvent): void => {
      if (!pointers.current.has(e.pointerId)) {
        return
      }
      const prev = pointers.current.get(e.pointerId)
      pointers.current.set(e.pointerId, { x: e.offsetX, y: e.offsetY })

      // Pinch-зум на двох вказівниках.
      if (pointers.current.size === 2) {
        const pts = [...pointers.current.values()]
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        if (gesture.current.pinchDist > 0) {
          const factor = gesture.current.pinchDist / (dist || 1)
          zoomPrice(factor, gesture.current.pinchCenterY)
        }
        gesture.current.pinchDist = dist
        gesture.current.pinchCenterY = (pts[0].y + pts[1].y) / 2
        e.preventDefault()
        return
      }

      const g = gesture.current
      const dx = e.offsetX - g.startX
      const dy = e.offsetY - g.startY

      if (g.kind === 'axisPan') {
        const stepY = e.offsetY - (prev?.y ?? e.offsetY)
        panPrice(stepY)
        e.preventDefault()
        return
      }

      if (g.kind === 'controller') {
        moveController(e.offsetY)
        e.preventDefault()
        return
      }

      if (g.kind === 'undecided') {
        if (Math.abs(dx) > AXIS_DOMINANCE || Math.abs(dy) > AXIS_DOMINANCE) {
          // Вертикальний драг рухає контролер лише в інтерактивному режимі.
          const vertical = state.current.interactive ? 'controller' : 'none'
          g.kind = Math.abs(dx) > Math.abs(dy) ? 'timeframe' : vertical
        }
      }

      if (g.kind === 'controller') {
        moveController(e.offsetY)
        e.preventDefault()
      } else if (g.kind === 'timeframe') {
        // Горизонтальний зум часу: драг праворуч — менше свічок (деталізація),
        // ліворуч — більше (ширший період).
        const target = g.startVisible - dx * XZOOM_PER_PX
        applyXZoom(target)
        // На краях зуму — раз за жест перемикаємо granularity таймфрейму.
        const max = state.current.candlesLength
        if (!g.tfFired) {
          if (target > max + 40) {
            const next = shiftTimeframe(state.current.timeframe, 1)
            if (next !== state.current.timeframe) {
              g.tfFired = true
              state.current.onTimeframeChange(next)
            }
          } else if (target < MIN_VISIBLE - 40) {
            const next = shiftTimeframe(state.current.timeframe, -1)
            if (next !== state.current.timeframe) {
              g.tfFired = true
              state.current.onTimeframeChange(next)
            }
          }
        }
        e.preventDefault()
      }
    }

    const onPointerUp = (e: PointerEvent): void => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) {
        gesture.current.pinchDist = 0
      }
      if (pointers.current.size === 0) {
        gesture.current.kind = 'none'
      }
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId)
      }
    }

    const onWheel = (e: WheelEvent): void => {
      // Shift+колесо — горизонтальний зум часу (де завгодно).
      if (e.shiftKey) {
        e.preventDefault()
        // Браузер при Shift часто перетворює прокрутку на горизонтальну (deltaX),
        // тож беремо домінантну дельту, щоб не втратити напрямок.
        const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
        const factor = raw > 0 ? 1.15 : 0.87
        const base = state.current.visibleCount || state.current.candlesLength
        applyXZoom(base * factor)
        return
      }
      // Колесо над віссю цін — зум по ціні.
      const onAxis = e.offsetX > state.current.size.width - AXIS_WIDTH
      if (!onAxis) {
        return
      }
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.1 : 0.9
      zoomPrice(factor, e.offsetY)
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [ref])
}
