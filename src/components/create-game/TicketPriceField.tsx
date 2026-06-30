import type { FC } from 'react'
import { FieldLabel } from './FieldLabel'
import { FieldError } from './FieldError'
import { useT } from '../../i18n/useT'

/** Пропси поля ціни квитка. */
interface TicketPriceFieldProps {
  /** Поточне значення (рядок, щоб дозволити проміжний ввід «0.»). */
  value: string
  /** Обробник зміни. */
  onChange: (value: string) => void
  /** Обробник blur (для відкладеного показу помилки). */
  onBlur: () => void
  /** Текст помилки (null — без помилки). */
  error: string | null
}

/** Класи рамки/фону за станом (норма / помилка). */
const stateClass = (hasError: boolean): string =>
  hasError ? 'border-[#e5484d] bg-[rgba(229,72,77,0.1)]' : 'border-text-primary bg-[rgba(255,255,255,0.1)]'

/**
 * Поле ціни квитка: числовий ввід із суфіксом «GRAM».
 * Мін. 0.1; помилка показується після blur.
 */
export const TicketPriceField: FC<TicketPriceFieldProps> = ({ value, onChange, onBlur, error }) => {
  const hasError = Boolean(error)
  const { t } = useT()

  return (
    <div className="flex w-full flex-col gap-3">
      <FieldLabel htmlFor="ticket-price">{t('createGame.ticketPriceLabel')}</FieldLabel>
      <div
        className={`flex h-12 w-full items-center justify-between border px-4 ${stateClass(hasError)}`}
      >
        <input
          id="ticket-price"
          type="number"
          inputMode="decimal"
          min={0.1}
          step={0.1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={hasError}
          aria-describedby={hasError ? 'ticket-price-error' : undefined}
          className="min-w-0 flex-1 bg-transparent font-mono text-[18px] font-bold text-text-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="ml-2 font-mono text-[18px] font-bold text-text-secondary">{t('createGame.gramSuffix')}</span>
      </div>
      <FieldError id="ticket-price-error" message={error} />
    </div>
  )
}
