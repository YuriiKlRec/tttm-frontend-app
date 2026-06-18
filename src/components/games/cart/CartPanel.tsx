import type { FC } from 'react'
import { CartRow } from './CartRow'
import { totalTon } from '../../../utils/price'
import ticketIcon from '../../../assets/icon-ticket.svg'
import chevronDownIcon from '../../../assets/icon-chevron-down.svg'

/** Пропси панелі перегляду заброньованих ставок (замість графіка). */
interface CartPanelProps {
  /** Заброньовані ціни. */
  prices: number[]
  /** Ціна одного квитка в TON. */
  ticketPrice: string
  /** Згорнути панель (повернутися на графік) — ставки лишаються. */
  onClose: () => void
  /** Очистити всі ставки та згорнути панель. */
  onClearAll: () => void
  /** Повернути ціну в поле для редагування (прибирає з корзини). */
  onEdit: (price: number) => void
  /** Видалити одну ставку. */
  onRemove: (price: number) => void
}

/**
 * Панель Booked: заміщує центральну область (графік) списком заброньованих
 * ставок. Зверху — caret згортання та заголовок із сумою, у тілі — список
 * ставок або порожній стан, унизу — дії «Clear all» / «Hide panel».
 */
export const CartPanel: FC<CartPanelProps> = ({
  prices,
  ticketPrice,
  onClose,
  onClearAll,
  onEdit,
  onRemove,
}) => {
  const count = prices.length

  return (
    <div className="flex h-full flex-col border-t border-[rgba(255,255,255,0.25)] bg-surface">
      <button
        type="button"
        aria-label="Hide booked predictions"
        onClick={onClose}
        className="flex h-9 w-full shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
      >
        <img src={chevronDownIcon} alt="" aria-hidden="true" className="h-4 w-4" />
      </button>

      <div className="flex shrink-0 items-center justify-between px-6 pb-4">
        <span className="flex items-center gap-2">
          <img src={ticketIcon} alt="" aria-hidden="true" className="w-6" />
          <span className="font-mono text-[15px] text-text-primary">Booked:</span>
        </span>
        <span className="font-mono text-[15px] text-text-primary">
          {count} | {totalTon(count, ticketPrice)}
        </span>
      </div>

      {count === 0 ? (
        <p className="flex flex-1 items-center justify-center px-6 text-center font-body text-[15px] leading-relaxed text-text-secondary">
          You have not booked
          <br />
          any predictions yet.
        </p>
      ) : (
        <ul className="flex-1 space-y-5 overflow-y-auto px-6 pt-1 pb-4 scrollbar-hide">
          {prices.map((price) => (
            <CartRow key={price.toFixed(2)} price={price} onEdit={onEdit} onRemove={onRemove} />
          ))}
        </ul>
      )}

      {count > 0 && (
        <div className="flex shrink-0 items-center justify-center gap-8 px-6 py-4">
          <button
            type="button"
            onClick={onClearAll}
            className="font-mono text-[15px] font-bold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[15px] font-bold text-text-focus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Hide panel
          </button>
        </div>
      )}
    </div>
  )
}
