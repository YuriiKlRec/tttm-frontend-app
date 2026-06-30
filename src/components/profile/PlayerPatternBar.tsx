import type { FC } from 'react'
import type { PatternType } from '../../types/profile'

/** Пропси вертикального індикатора патерну гравця. */
interface PlayerPatternBarProps {
  type: PatternType
  /** Рівень шкали 0..1. Формула рейтингу — тимчасова заглушка, буде уточнена пізніше. */
  level: number
}

/**
 * Маппінг типу патерну на кольори:
 * - optimist → зелений маркер вгорі, порожній (сірий) знизу
 * - pessimist → червоний маркер знизу, порожній (сірий) вгорі
 * - neutral → сірий маркер по центру, обидві секції сірі
 */
const TYPE_COLOR: Record<PatternType, string> = {
  optimist: '#46a758',
  pessimist: '#e5484d',
  neutral: '#6e6e6e',
}

/**
 * Кольори верхньої та нижньої секцій в залежності від типу.
 * Заповнена сторона отримує колір типу, порожня — нейтральний сірий.
 */
const SECTION_COLORS: Record<PatternType, { top: string; bottom: string }> = {
  optimist: { top: '#46a758', bottom: '#6e6e6e' },
  pessimist: { top: '#6e6e6e', bottom: '#e5484d' },
  neutral: { top: '#6e6e6e', bottom: '#6e6e6e' },
}

/**
 * Вертикальний gauge-індикатор патерну гравця (12×44px).
 *
 * Структура:
 *  - верхня секція: рамка зліва/справа/зверху (кольор залежить від типу)
 *  - маркер (4px): суцільна заливка, позиція top = (1 - level) * 100%
 *  - нижня секція: рамка зліва/справа/знизу
 *
 * Позиція маркера: (1 - level) * 100% — level=1 → маркер вгорі, level=0 → внизу.
 * Формула рейтингу є тимчасовою; після появи реальної формули — перерахувати level.
 */
export const PlayerPatternBar: FC<PlayerPatternBarProps> = ({ type, level }) => {
  const clampedLevel = Math.min(1, Math.max(0, level))

  const markerColor = TYPE_COLOR[type]
  const { top: topColor, bottom: bottomColor } = SECTION_COLORS[type]

  /**
   * Розміри в % від висоти контейнера (44px):
   *  - маркер займає ~9% (~4px із 44px)
   *  - верхня секція: від 0 до початку маркера
   *  - нижня секція: від кінця маркера до 100%
   *
   * markerTop = (1 - level) * 91% — щоб маркер не виходив за межі
   * (залишаємо 9% запасу знизу)
   */
  const MARKER_H = 9 // % від висоти
  const markerTopPct = (1 - clampedLevel) * (100 - MARKER_H)
  const markerBottomPct = 100 - markerTopPct - MARKER_H

  const topInset = `0 0 ${100 - markerTopPct}% 0`
  const markerInset = `${markerTopPct}% 0 ${markerBottomPct}% 0`
  const bottomInset = `${markerTopPct + MARKER_H}% 0 0 0`

  return (
    <div className="relative h-[44px] w-[12px]" aria-hidden="true">
      {/* Верхня секція з рамкою зліва/справа/зверху */}
      <div
        className="absolute border-l border-r border-t border-solid"
        style={{ inset: topInset, borderColor: topColor }}
      />
      {/* Маркер — заповнена смуга рівня */}
      <div
        className="absolute"
        style={{ inset: markerInset, backgroundColor: markerColor }}
      />
      {/* Нижня секція з рамкою зліва/справа/знизу */}
      <div
        className="absolute border-b border-l border-r border-solid"
        style={{ inset: bottomInset, borderColor: bottomColor }}
      />
    </div>
  )
}
