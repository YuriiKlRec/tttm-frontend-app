import type { CSSProperties, FC } from 'react'
import { HintIcon } from './HintIcon'
import {
  getPlotRect,
  priceToY,
  type ChartMode,
  type ControllerState,
  type PriceRange,
} from './chartTypes'
import trophyIcon from '../../../assets/icon-trophy.svg'
import candlestickIcon from '../../../assets/icon-candlestick.svg'
import hintChoose from '../../../assets/hint-choose.svg'
import hintZoom from '../../../assets/hint-zoom.svg'
import hintScroll from '../../../assets/hint-scroll.svg'

/** Пропси DOM-оверлеїв поверх canvas. */
interface ChartOverlaysProps {
  /** Виграшний пул (напр. "2.4 TON"). */
  winningPool: string
  /** Режим графіка (для активного стану кнопки). */
  mode: ChartMode
  /** Перемикання режиму line/candles. */
  onToggleMode: () => void
  /** Вибрана ціна Y-контролера. */
  selectedPrice: number
  /** Стан контролера — для кольору боксу значення. */
  controllerState: ControllerState
  /** Діапазон цін (для позиції боксу). */
  priceRange: PriceRange
  /** Розміри області (CSS px). */
  size: { width: number; height: number }
  /** Інтерактивний режим: false для завершеної гри (без Choose і боксу контролера). */
  interactive: boolean
}

/** Класи боксу значення контролера за станом (фон + текст). */
const BOX_CLASS: Record<ControllerState, string> = {
  default: 'bg-white text-[#323232]',
  mine: 'bg-[#ef9723] text-[#323232]',
  others: 'bg-[#e5484d] text-white',
}

/** Дані легенди жестів (Choose — лише в інтерактивному режимі). */
const HINT_CHOOSE = { label: 'Choose', overlay: hintChoose } as const
const HINTS_BASE = [
  { label: 'Zoom', overlay: hintZoom },
  { label: 'Scroll', overlay: hintScroll },
] as const

/**
 * DOM-оверлеї графіка: пул (top-left), кнопка свічок (bottom-left),
 * легенда жестів (bottom-center) та бокс значення Y-контролера (справа).
 */
export const ChartOverlays: FC<ChartOverlaysProps> = ({
  winningPool,
  mode,
  onToggleMode,
  selectedPrice,
  controllerState,
  priceRange,
  size,
  interactive,
}) => {
  const hints = interactive ? [HINT_CHOOSE, ...HINTS_BASE] : HINTS_BASE
  const { top, bottom } = getPlotRect(size.width, size.height)
  const controllerY = priceToY(selectedPrice, priceRange, top, bottom)
  // Бокс значення контролера — поверх осі цін (праворуч), як цінник.
  const boxStyle: CSSProperties = {
    top: controllerY,
    right: 2,
    transform: 'translateY(-50%)',
  }

  return (
    <>
      {/* Пул */}
      <div className="pointer-events-none absolute top-7 left-6 flex items-center gap-1.5 bg-[rgba(50,50,50,0.75)] px-2 py-2.5">
        <img src={trophyIcon} alt="" aria-hidden="true" className="h-4 w-4" />
        <span className="font-mono text-[15px] text-text-primary">{winningPool}</span>
      </div>

      {/* Кнопка свічок */}
      <button
        type="button"
        onClick={onToggleMode}
        aria-label={mode === 'candles' ? 'Switch to line chart' : 'Switch to candles'}
        aria-pressed={mode === 'candles'}
        className={`absolute bottom-16 left-3 flex h-8 w-8 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
          mode === 'candles' ? 'opacity-100' : 'opacity-60'
        }`}
      >
        <img src={candlestickIcon} alt="" aria-hidden="true" className="h-6 w-6" />
      </button>

      {/* Легенда жестів */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-8">
        {hints.map((hint) => (
          <span key={hint.label} className="flex items-center gap-1.5">
            <HintIcon overlay={hint.overlay} />
            <span className="font-mono text-[13px] font-bold text-text-secondary">
              {hint.label}
            </span>
          </span>
        ))}
      </div>

      {/* Бокс значення Y-контролера (лише в інтерактивному режимі) */}
      {interactive && controllerY >= top && controllerY <= bottom && (
        <span
          className={`pointer-events-none absolute px-1.5 py-0.5 font-mono text-[11px] font-bold [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.5))] ${BOX_CLASS[controllerState]}`}
          style={boxStyle}
        >
          ${selectedPrice.toFixed(2)}
        </span>
      )}
    </>
  )
}
