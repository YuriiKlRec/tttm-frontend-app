import type { ChangeEvent, FC } from 'react'
import type { PriceStatus } from '../../utils/price'
import minusIcon from '../../assets/icon-minus.svg'
import plusIcon from '../../assets/icon-step-plus.svg'

/** Пропси поля вводу ціни прогнозу зі степерами. */
interface PriceInputProps {
  /** Сире значення поля (рядок). */
  value: string
  /** Статус ціни — впливає на колір рамки. */
  status: PriceStatus
  /** Зміна тексту вводу. */
  onChange: (value: string) => void
  /** Крок −1 TON (не нижче 0). */
  onDecrement: () => void
  /** Крок +1 TON. */
  onIncrement: () => void
}

/** Колір рамки поля за статусом ціни. */
const borderByStatus = (status: PriceStatus): string => {
  if (status === 'taken') {
    return 'border-[#e5484d]'
  }
  if (status === 'yours') {
    return 'border-[#ef9723]'
  }
  return 'border-white'
}

/** Спільні класи тап-зони степера (44px ціль для дотику). */
const stepperClass =
  'absolute inset-y-0 flex w-11 items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white'

/**
 * Поле вводу ціни: керований input + суфікс "USDT", рамка залежить від статусу,
 * по краях — степери −/+ із тап-зоною 44px. Ввід дозволяє цифри й одну крапку.
 */
export const PriceInput: FC<PriceInputProps> = ({
  value,
  status,
  onChange,
  onDecrement,
  onIncrement,
}) => {
  const handleInput = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.value)
  }

  return (
    <div
      className={`relative flex flex-1 flex-col items-center gap-1.5 border bg-[rgba(255,255,255,0.1)] px-11 py-2 ${borderByStatus(status)}`}
    >
      <span className="font-mono text-[11px] text-white">Prediction price:</span>
      <div className="flex items-center gap-1 font-mono text-[15px] font-bold text-white">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleInput}
          aria-label="Prediction price"
          placeholder="0.00"
          className="w-24 bg-transparent text-center font-mono text-[15px] font-bold text-white outline-none placeholder:text-text-secondary"
        />
        <span aria-hidden="true">USDT</span>
      </div>

      <button
        type="button"
        onClick={onDecrement}
        aria-label="Decrease price"
        className={`${stepperClass} left-0`}
      >
        <img src={minusIcon} alt="" aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Increase price"
        className={`${stepperClass} right-0`}
      >
        <img src={plusIcon} alt="" aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  )
}
