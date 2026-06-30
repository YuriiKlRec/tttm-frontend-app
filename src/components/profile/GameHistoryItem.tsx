import type { FC } from 'react'
import { Link } from 'react-router-dom'
import type { ProfileGame, GameOutcome } from '../../types/profile'
import { useAuth } from '../../hooks/useAuth'
import { useT } from '../../i18n/useT'
import { useLocale } from '../../i18n/locale'
import { formatInTz } from '../../utils/datetime'
import ticketIcon from '../../assets/icon-ticket.svg'
import receiptIcon from '../../assets/icon-receipt-orange.svg'

/** Пропси одного рядка історії ігор. */
interface GameHistoryItemProps {
  game: ProfileGame
}

/** Клас кольору суми залежно від статусу. */
const AMOUNT_COLOR: Record<GameOutcome, string> = {
  win: 'text-text-success',
  miss: 'text-[#6e6e6e]',
  pending: 'text-text-focus',
}

/**
 * Картка одного запису в історії ігор профілю.
 *
 * Показує:
 *  - рядок 1: назва гри (посилання) + статус
 *  - рядок 2: кількість прогнозів + сума
 *  - рядок 3 (win/miss): посилання на контракт у explorer
 *  - рядок 3 (pending): відформатована дата з урахуванням TZ гравця
 */
export const GameHistoryItem: FC<GameHistoryItemProps> = ({ game }) => {
  const { id, name, predictions, amount, status, contractShort, contractUrl, date } = game
  const { tz } = useAuth()
  const { t } = useT()
  const locale = useLocale()

  const STATUS_LABEL: Record<GameOutcome, string> = {
    win: t('profile.outcomeWin'),
    miss: t('profile.outcomeMiss'),
    pending: t('profile.outcomePending'),
  }

  return (
    <div className="flex flex-col gap-3 bg-surface px-5 py-4">
      {/* Рядок 1: назва + статус */}
      <div className="flex items-center justify-between">
        <Link
          to={`/game/${id}`}
          className="font-body text-[15px] font-bold text-text-primary"
        >
          {name}
        </Link>

        {status === 'win' && (
          <span className="font-mono text-[15px] font-bold text-text-success">
            {STATUS_LABEL.win}
          </span>
        )}
        {status === 'miss' && (
          <span className="font-mono text-[15px] font-bold text-[#6e6e6e]">
            {STATUS_LABEL.miss}
          </span>
        )}
        {status === 'pending' && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-[#ef9723]" aria-hidden="true" />
            <span className="font-mono text-[15px] font-bold text-text-focus">
              {STATUS_LABEL.pending}
            </span>
          </div>
        )}
      </div>

      {/* Рядок 2: кількість прогнозів + сума */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={ticketIcon} alt="" aria-hidden="true" className="h-4 w-4" />
          <span className="font-mono text-[15px] text-text-primary">
            {t('profile.predictions', { count: predictions })}
          </span>
        </div>
        <span className={`font-mono text-[15px] font-bold ${AMOUNT_COLOR[status]}`}>
          {amount}
        </span>
      </div>

      {/* Рядок 3 (win/miss): посилання на смарт-контракт */}
      {(status === 'win' || status === 'miss') && contractUrl && contractShort ? (
        <div className="flex items-center gap-1">
          <a
            href={contractUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('common.viewSmartContract')}
            className="flex items-center gap-1"
          >
            <img src={receiptIcon} alt="" aria-hidden="true" className="h-4 w-4" />
            <span className="font-mono text-[13px] font-bold text-text-focus">
              {contractShort}
            </span>
          </a>
        </div>
      ) : null}

      {/* Рядок 3 (pending): дата гри */}
      {status === 'pending' && date != null ? (
        <span className="font-mono text-[11px] text-text-primary">
          {formatInTz(date, tz, locale)}
        </span>
      ) : null}
    </div>
  )
}
