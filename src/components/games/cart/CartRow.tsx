import type { FC } from 'react'
import { formatUsd } from '../../../utils/price'
import timesIcon from '../../../assets/icon-times.svg'

/** Пропси рядка заброньованої ставки в панелі Booked. */
interface CartRowProps {
  /** Ціна ставки. */
  price: number
  /** Повернути ціну в поле вводу для редагування (прибирає з корзини). */
  onEdit: (price: number) => void
  /** Видалити ставку з корзини. */
  onRemove: (price: number) => void
}

/**
 * Рядок панелі Booked: ціна ставки зліва, дії «Edit» і видалення (✕) справа.
 */
export const CartRow: FC<CartRowProps> = ({ price, onEdit, onRemove }) => (
  <li className="flex items-center justify-between">
    <span className="font-mono text-[22px] font-bold text-text-primary">{formatUsd(price)}</span>
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => onEdit(price)}
        className="font-mono text-[13px] font-bold text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Edit
      </button>
      <button
        type="button"
        aria-label={`Remove prediction ${formatUsd(price)}`}
        onClick={() => onRemove(price)}
        className="flex h-6 w-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <img src={timesIcon} alt="" aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  </li>
)
