import type { FC } from 'react'
import type { PriceStatus } from '../../utils/price'
import { useT } from '../../i18n/useT'

/** Пропси підказки під формою ставки. */
interface BetHintProps {
  /** Статус поточної введеної ціни. */
  status: PriceStatus
  /** Кількість уже заброньованих цін. */
  bookedCount: number
}

/** Підказка стану ставки під формою (колір залежить від статусу). */
export const BetHint: FC<BetHintProps> = ({ status, bookedCount }) => {
  const { t } = useT()

  let text: string
  let className: string

  if (status === 'taken') {
    text = t('bet.ticketTaken')
    className = 'text-[#e5484d]'
  } else if (status === 'yours') {
    text = t('bet.yourTicket')
    className = 'text-text-focus'
  } else if (status === 'booked-active') {
    text = t('bet.ticketBooked')
    className = 'text-text-focus'
  } else if (status === 'empty' && bookedCount > 0) {
    text = t('bet.ticketBooked')
    className = 'text-text-focus'
  } else {
    text = t('bet.selectPrices')
    className = 'text-text-secondary'
  }

  return <p className={`text-center text-[12px] ${className}`}>{text}</p>
}
