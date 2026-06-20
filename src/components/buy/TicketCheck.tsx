import type { FC } from 'react'
import { TicketRow } from './TicketRow'
import { CheckTeeth } from './CheckTeeth'
import type { Check } from '../../types/buyTickets'
import type { CheckSummary } from '../../hooks/useTicketChecks'
import ticketIcon from '../../assets/icon-ticket.svg'
import dividerIcon from '../../assets/check-divider.svg'

/** Пропси тіла чека. */
interface TicketCheckProps {
  /** Дані чека. */
  check: Check
  /** Похідні підсумки (Total/Pay). */
  summary: CheckSummary
  /** Перемкнути ставку за індексом у чеку. */
  onToggleTicket: (ticketIndex: number) => void
  /** Відкрити модалку ALREADY TAKEN для ставки. */
  onTicketInfo: (price: number) => void
}

/**
 * Тіло чека (сірий блок із піксельними зубцями знизу): заголовок «Booked
 * predictions:», список рядків ставок, штриховий дивайдер на всю ширину чека
 * та підсумки Total/Pay.
 */
export const TicketCheck: FC<TicketCheckProps> = ({
  check,
  summary,
  onToggleTicket,
  onTicketInfo,
}) => {
  return (
    <div className="relative flex flex-col gap-8 bg-surface pt-8 pb-12">
      <div className="flex items-center gap-[9px] px-7">
        <img src={ticketIcon} alt="" aria-hidden="true" className="h-4 w-6" />
        <span className="font-mono text-[15px] font-bold text-text-primary">
          Booked predictions:
        </span>
      </div>

      <div className="flex flex-col gap-5">
        <ul className="flex flex-col gap-5">
          {check.tickets.map((ticket, index) => (
            <TicketRow
              key={`${ticket.price.toFixed(2)}-${index}`}
              price={ticket.price}
              status={ticket.status}
              onToggle={() => onToggleTicket(index)}
              onInfo={() => onTicketInfo(ticket.price)}
            />
          ))}
        </ul>

        <div className="flex h-4 items-center">
          <img src={dividerIcon} alt="" aria-hidden="true" className="h-4 w-full" />
        </div>

        <div className="flex items-center justify-between px-7 font-mono text-[16px] font-bold text-text-primary">
          <span>Total:</span>
          <span>{summary.activeCount}</span>
        </div>
        <div className="flex items-center justify-between px-7 font-mono text-[16px] font-bold">
          <span className="text-text-primary">Pay:</span>
          <span className="text-text-focus">{summary.payTon}</span>
        </div>
      </div>

      <CheckTeeth />
    </div>
  )
}
