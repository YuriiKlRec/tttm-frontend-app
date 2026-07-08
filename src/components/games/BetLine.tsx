import type { FC } from 'react'
import type { BetLineVariant } from '../../types/game'
import { useT } from '../../i18n/useT'
import ticketIcon from '../../assets/icon-ticket.svg'
import ticketRedIcon from '../../assets/icon-ticket-red.svg'
import crownIcon from '../../assets/icon-crown.svg'

/** Пропси одного рядка ставки. */
interface BetLineProps {
  /** Ранг у списку. */
  rank: number
  /** Нік гравця з @. */
  user: string
  /** Спрогнозована ціна. */
  price: string
  /** Варіант відображення рядка (лише для корони переможця). */
  variant: BetLineVariant
  /** Чи належить ставка поточному користувачу — керує кольором тексту/іконки. */
  mine: boolean
}

/** Колір тексту @user і ціни: оранжевий лише для власної ставки. */
const textColor = (mine: boolean): string => (mine ? 'text-text-focus' : 'text-text-primary')

/**
 * Рядок ставки у списку прогнозів: зліва ранг і @user, справа тікет і ціна.
 * Колір тексту/іконки визначається лише належністю ставки користувачу (`mine`).
 * `variant === 'win'` додає корону над знаком @ незалежно від кольору —
 * переможець, який не є поточним користувачем, лишається звичайного кольору.
 */
export const BetLine: FC<BetLineProps> = ({ rank, user, price, variant, mine }) => {
  const color = textColor(mine)
  const { t } = useT()

  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-3">
        <span className="w-5 text-center font-mono text-[15px] font-bold text-text-secondary">
          {rank}
        </span>
        <span className="relative">
          {variant === 'win' ? (
            <img
              src={crownIcon}
              alt={t('game.winnerAlt')}
              className="absolute left-[-10px] top-[-4px] h-4 w-4 -rotate-[30deg]"
            />
          ) : null}
          <span className={`font-body text-[15px] font-bold ${color}`}>{user}</span>
        </span>
      </span>
      <span className="flex items-center gap-2">
        <img
          src={mine ? ticketIcon : ticketRedIcon}
          alt=""
          aria-hidden="true"
          className="h-4 w-4"
        />
        <span className={`font-mono text-[15px] font-bold ${color}`}>{price}</span>
      </span>
    </div>
  )
}
