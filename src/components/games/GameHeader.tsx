import type { FC } from 'react'
import { ViewSelector } from './ViewSelector'
import { Glyph } from '../ui/Glyph'
import { useNow } from '../../hooks/useNow'
import { formatCountdown, formatDateTime } from '../../utils/time'
import type { ViewMode } from '../../types/game'

/** Пропси шапки сторінки гри. */
interface GameHeaderProps {
  /** Назва гри. */
  name: string
  /** Кінець гри (epoch ms) — ціль зворотного відліку. */
  endTime: number
  /** Поточний вид центральної області. */
  viewMode: ViewMode
  /** Колбек зміни виду. */
  onViewChange: (value: ViewMode) => void
  /** Чи активний фільтр «лише мої ставки» (для виду Predictions). */
  mineOnly: boolean
  /** Перемикання фільтра «лише мої ставки». */
  onToggleMine: () => void
}

/**
 * Фіксована шапка сторінки гри: зліва назва + лінія дій (перемикач виду + кнопка
 * учасників), справа бокс із живим зворотним відліком до кінця гри та датою.
 * Суцільний темний фон перекриває фонову сітку; враховує safe-area зверху.
 */
export const GameHeader: FC<GameHeaderProps> = ({
  name,
  endTime,
  viewMode,
  onViewChange,
  mineOnly,
  onToggleMine,
}) => {
  const now = useNow()
  const countdown = formatCountdown(endTime - now)

  return (
    <header
      className="relative z-20 flex items-start justify-between bg-background pr-6 pb-3 pl-6"
      style={{ paddingTop: 'calc(var(--app-safe-top) + 12px)' }}
    >
      <div className="flex flex-col items-start gap-[9px]">
        <h1 className="font-body text-[18px] font-bold text-text-primary">{name}</h1>
        <div className="flex items-start gap-[9px]">
          <ViewSelector value={viewMode} onChange={onViewChange} />
          {viewMode === 'bets' && (
            <button
              type="button"
              aria-label="Show only my tickets"
              aria-pressed={mineOnly}
              onClick={onToggleMine}
              className={`flex h-7 w-7 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                mineOnly
                  ? 'bg-[#ef9723] text-[#323232]'
                  : 'border border-white/50 bg-surface text-text-primary'
              }`}
            >
              <Glyph name="players" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="relative top-[14px] right-[-10px] flex flex-col items-center justify-center border border-white/50 bg-surface px-3 py-2">
        <span className="font-mono text-[16px] font-bold text-text-primary">{countdown}</span>
        <span className="font-mono text-[13px] text-text-secondary">{formatDateTime(endTime)}</span>
      </div>
    </header>
  )
}
