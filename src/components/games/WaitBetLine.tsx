import type { FC } from 'react'
import type { WaitBet } from '../../types/wait'
import { useT } from '../../i18n/useT'
import crownIcon from '../../assets/icon-crown.svg'
import ticketIcon from '../../assets/icon-ticket.svg'
import ticketRedIcon from '../../assets/icon-ticket-red.svg'

/** Пропси рядка ставки у Wait-картці. */
interface WaitBetLineProps {
  /** Дані ставки. */
  bet: WaitBet
}

/**
 * Рядок ставки Wait-картки: зліва ранг і нік (для лідера — корона над знаком @),
 * справа — тікет і ціна. Своя ставка підсвічена оранжевим, чужа — біла/червона.
 */
export const WaitBetLine: FC<WaitBetLineProps> = ({ bet }) => {
  const color = bet.mine ? 'text-text-focus' : 'text-text-primary'
  const { t } = useT()

  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-3">
        <span className="w-5 text-center font-mono text-[15px] font-bold text-text-secondary">
          {/* rank 0 = позиція невідома (лідерборд ще без формули) → показуємо «—» */}
          {bet.rank > 0 ? bet.rank : '—'}
        </span>
        <span className="relative">
          {bet.rank === 1 ? (
            <img
              src={crownIcon}
              alt={t('game.leaderAlt')}
              className="absolute left-[-10px] top-[-4px] h-4 w-4 -rotate-[30deg]"
            />
          ) : null}
          <span className={`font-body text-[15px] font-bold ${color}`}>{bet.user}</span>
        </span>
      </span>
      <span className="flex items-center gap-2">
        <img
          src={bet.mine ? ticketIcon : ticketRedIcon}
          alt=""
          aria-hidden="true"
          className="h-4 w-4"
        />
        <span className={`font-mono text-[15px] font-bold ${color}`}>{bet.price}</span>
      </span>
    </div>
  )
}
