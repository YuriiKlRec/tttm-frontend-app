import type { FC } from 'react'
import type { PriceStatus } from '../../utils/price'

/** Пропси підказки під формою ставки. */
interface BetHintProps {
  /** Статус поточної введеної ціни. */
  status: PriceStatus
  /** Кількість уже заброньованих цін. */
  bookedCount: number
}

/** Текст + колір підказки за статусом і кількістю заброньованих. */
const resolveHint = (
  status: PriceStatus,
  bookedCount: number,
): { text: string; className: string } => {
  if (status === 'taken') {
    return { text: 'This ticket is already taken', className: 'text-[#e5484d]' }
  }
  if (status === 'yours') {
    return { text: 'This is your ticket', className: 'text-text-focus' }
  }
  if (status === 'booked-active') {
    return { text: 'Ticket booked! Want to add other prices?', className: 'text-text-focus' }
  }
  if (status === 'empty' && bookedCount > 0) {
    return { text: 'Ticket booked! Want to add other prices?', className: 'text-text-focus' }
  }
  return { text: 'Select one or more prices', className: 'text-text-secondary' }
}

/** Підказка стану ставки під формою (колір залежить від статусу). */
export const BetHint: FC<BetHintProps> = ({ status, bookedCount }) => {
  const { text, className } = resolveHint(status, bookedCount)
  return <p className={`text-center text-[12px] ${className}`}>{text}</p>
}
