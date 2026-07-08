import type { FC } from 'react'
import { ViewSelector } from './ViewSelector'
import { Glyph } from '../ui/Glyph'
import { useNow } from '../../hooks/useNow'
import { useAuth } from '../../hooks/useAuth'
import { useT } from '../../i18n/useT'
import { useLocale } from '../../i18n/locale'
import { formatCountdown } from '../../utils/time'
import { formatInTz } from '../../utils/datetime'
import type { ViewMode } from '../../types/game'
import btcIcon from '../../assets/icon-btc.svg'
// Примітка: браузерний TZ у Telegram-міні-апп збігається з пристроєм, тому
// formatInTz(…, tz) тут насамперед забезпечує консистентність і підтримку
// tz-овериду, збереженого на бекенді (user.timezone).

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
  /** Доступні види (для завершеної гри — без графіка). */
  viewOptions?: ViewMode[]
  /** Гра завершена — бокс показує дату й переможний курс замість відліку. */
  finished?: boolean
  /** Переможний (фінальний) курс для завершеної гри (напр. "$57,342.47"). */
  finalPrice?: string
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
  viewOptions,
  finished = false,
  finalPrice,
}) => {
  const now = useNow()
  const { tz } = useAuth()
  const { t } = useT()
  const locale = useLocale()
  const countdown = formatCountdown(endTime - now)

  return (
    <header
      className="relative z-20 flex items-stretch justify-between gap-3 bg-background pr-6 pb-3 pl-6"
      style={{ paddingTop: 'calc(var(--app-safe-top) + 12px)' }}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-[9px]">
        <h1 className="font-body text-[15px] font-bold break-words text-text-primary">{name}</h1>
        <div className="flex items-start gap-[9px]">
          <ViewSelector value={viewMode} onChange={onViewChange} options={viewOptions} />
          {viewMode === 'bets' && (
            <button
              type="button"
              aria-label={t('game.showOnlyMyTicketsAria')}
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

      <div className="relative right-[-10px] flex shrink-0 flex-col items-center justify-center gap-0.5 border border-white/50 bg-surface px-3 py-2">
        {finished ? (
          <>
            <span className="font-mono text-[13px] text-text-primary">
              {formatInTz(endTime, tz, locale)}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[15px] font-bold text-text-focus">
              <img src={btcIcon} alt="" aria-hidden="true" className="h-4 w-4" />
              {finalPrice}
            </span>
          </>
        ) : (
          <>
            {/* Дата (біла, акцент) зверху, таймер (сірий) під нею — кома в
                форматі дати вже забезпечує formatInTz (Intl за замовчуванням). */}
            <span className="font-mono text-[16px] font-bold text-text-primary">
              {formatInTz(endTime, tz, locale)}
            </span>
            <span className="font-mono text-[13px] text-text-secondary">{countdown}</span>
          </>
        )}
      </div>
    </header>
  )
}
