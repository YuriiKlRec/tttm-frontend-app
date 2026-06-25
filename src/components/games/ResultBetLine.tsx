import type { FC } from 'react'
import type { ResultBet } from '../../types/results'
import crownIcon from '../../assets/icon-crown.svg'
import ticketIcon from '../../assets/icon-ticket.svg'
import ticketRedIcon from '../../assets/icon-ticket-red.svg'

/** Пропси рядка ставки у Result-картці. */
interface ResultBetLineProps {
  /** Дані ставки. */
  bet: ResultBet
}

/**
 * Рядок ставки Result-картки: зліва ранг і нік (для лідера — корона над @),
 * справа — тікет і ціна. Своя ставка підсвічена оранжевим (оранжевий тікет),
 * чужа — біла з червоним тікетом. Структурно ідентичний WaitBetLine.
 */
export const ResultBetLine: FC<ResultBetLineProps> = ({ bet }) => {
  const color = bet.mine ? 'text-text-focus' : 'text-text-primary'

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
              alt="Winner"
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
