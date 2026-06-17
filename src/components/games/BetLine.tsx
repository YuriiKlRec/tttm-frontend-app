import type { FC } from 'react'
import type { BetLineVariant } from '../../types/game'
import ticketIcon from '../../assets/icon-ticket.svg'
import ticketRedIcon from '../../assets/icon-ticket-red.svg'
import trophyIcon from '../../assets/icon-trophy.svg'

/** Пропси одного рядка ставки. */
interface BetLineProps {
  /** Ранг у списку. */
  rank: number
  /** Нік гравця з @. */
  user: string
  /** Спрогнозована ціна. */
  price: string
  /** Варіант відображення рядка. */
  variant: BetLineVariant
}

/** Колір тексту @user і ціни за варіантом (win і mine — оранжеві). */
const textColor = (variant: BetLineVariant): string =>
  variant === 'default' ? 'text-text-primary' : 'text-text-focus'

/**
 * Рядок ставки у списку прогнозів: зліва ранг і @user, справа тікет і ціна.
 * `mine` — оранжевий текст (своя ставка); `win` — оранжевий текст + трофей
 * перед тікетом (заглушка стану переможця).
 */
export const BetLine: FC<BetLineProps> = ({ rank, user, price, variant }) => {
  const color = textColor(variant)

  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-3">
        <span className="w-5 text-center font-mono text-[15px] font-bold text-text-secondary">
          {rank}
        </span>
        <span className={`font-body text-[15px] font-bold ${color}`}>{user}</span>
      </span>
      <span className="flex items-center gap-2">
        {variant === 'win' ? (
          <img src={trophyIcon} alt="Winner" className="h-4 w-4" />
        ) : null}
        <img
          src={variant === 'default' ? ticketRedIcon : ticketIcon}
          alt=""
          aria-hidden="true"
          className="h-4 w-4"
        />
        <span className={`font-mono text-[15px] font-bold ${color}`}>{price}</span>
      </span>
    </div>
  )
}
