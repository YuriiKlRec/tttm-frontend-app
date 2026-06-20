import type { FC } from 'react'
import { formatUsd } from '../../utils/price'
import { CheckTeeth } from './CheckTeeth'
import { ConfettiBurst } from './ConfettiBurst'
import badgeCheck from '../../assets/badge-check.svg'

/** Пропси success-екрана оплаченого чека. */
interface CheckSuccessProps {
  /** Ціни успішно оплачених ставок. */
  prices: number[]
}

/**
 * Success-екран чека: конфеті + зелений піксельний badge ✓ + текст
 * «Success! You in game with this tickets:» + список оплачених цін.
 * Замінює тіло чека після успішної оплати.
 */
export const CheckSuccess: FC<CheckSuccessProps> = ({ prices }) => (
  <div className="relative flex flex-col items-center gap-8 bg-surface pt-8 pb-12">
    <div className="flex flex-col items-center gap-3 py-14">
      <div className="relative">
        <ConfettiBurst />
        <img src={badgeCheck} alt="" aria-hidden="true" className="h-8 w-8" />
      </div>
      <p className="w-40 text-center font-body text-[15px] text-text-primary">
        Success! You in game with this tickets:
      </p>
      {prices.map((price, index) => (
        <span
          key={`${price.toFixed(2)}-${index}`}
          className="font-mono text-[18px] font-bold text-text-primary"
        >
          {formatUsd(price)}
        </span>
      ))}
    </div>

    <CheckTeeth />
  </div>
)
