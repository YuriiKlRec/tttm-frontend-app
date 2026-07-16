import type { CSSProperties, FC } from 'react'
import { HintIcon } from './HintIcon'
import {
  getPlotRect,
  resolveControllerPosition,
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
  /** Контролер вже поставлений тапом (A1) — доки false, бокс значення не показуємо. */
  controllerVisible: boolean
}

/** Класи боксу значення контролера за станом (фон + текст). */
const BOX_CLASS: Record<ControllerState, string> = {
  default: 'bg-white text-surface',
  mine: 'bg-[#ef9723] text-surface',
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
  controllerVisible,
}) => {
  const hints = interactive ? [HINT_CHOOSE, ...HINTS_BASE] : HINTS_BASE
  const { top, bottom } = getPlotRect(size.width, size.height)
  // Прилипання до краю (A8): якщо ціна поза видимим діапазоном — бокс
  // клампиться до top/bottom з індикатором напрямку (▲/▼).
  const { y: controllerY, edge } = resolveControllerPosition(selectedPrice, priceRange, top, bottom)
  // Бокс значення контролера — поверх осі цін (праворуч), як цінник.
  const boxStyle: CSSProperties = {
    top: controllerY,
    right: 2,
    transform: 'translateY(-50%)',
  }

  return (
    <>
      {/* Пул — показуємо лише коли він є (інакше плейсхолдер "—" не виводимо) */}
      {winningPool && winningPool !== '—' ? (
        <div className="pointer-events-none absolute top-7 left-6 flex items-center gap-1.5 bg-surface/75 px-2 py-2.5">
          <img src={trophyIcon} alt="" aria-hidden="true" className="h-4 w-4" />
          <span className="font-mono text-[15px] text-text-primary">{winningPool}</span>
        </div>
      ) : null}

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

      {/* Легенда жестів — компактні відступи: ближче до тіла графіка і до низу */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-8">
        {hints.map((hint) => (
          <span key={hint.label} className="flex items-center gap-1.5">
            <HintIcon overlay={hint.overlay} />
            <span className="font-mono text-[13px] font-bold text-text-secondary">
              {hint.label}
            </span>
          </span>
        ))}
      </div>

      {/* Бокс значення Y-контролера: лише в інтерактивному режимі і лише після
          першого тапу (A1 — прихований, доки контролер не поставлений).
          Поза видимим діапазоном — прилипає до краю з індикатором напрямку (A8). */}
      {interactive && controllerVisible && (
        <span
          className={`pointer-events-none absolute px-1.5 py-0.5 font-mono text-[11px] font-bold [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.5))] ${BOX_CLASS[controllerState]}`}
          style={boxStyle}
        >
          {edge === 'above' ? '▲ ' : edge === 'below' ? '▼ ' : ''}
          ${selectedPrice.toFixed(2)}
        </span>
      )}
    </>
  )
}
