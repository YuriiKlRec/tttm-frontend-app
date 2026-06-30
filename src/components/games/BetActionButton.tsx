import type { FC } from 'react'
import { Glyph } from '../ui/Glyph'
import { useT } from '../../i18n/useT'

/** Візуальний варіант action-кнопки ставки. */
type BetActionVariant = 'book' | 'remove' | 'disabled'

/** Пропси квадратної action-кнопки (галочка/хрестик) з піксельними боками. */
interface BetActionButtonProps {
  /** Варіант: book (оранж, галочка), remove (червоний, ✕), disabled (сірий). */
  variant: BetActionVariant
  /** Обробник кліку (ігнорується для disabled). */
  onClick?: () => void
}

/** Колір фону за варіантом. */
const BG: Record<BetActionVariant, string> = {
  book: 'bg-[#ef9723]',
  remove: 'bg-[#e5484d]',
  disabled: 'bg-[#5a5a5a]',
}

/**
 * Квадратна (36×36) action-кнопка ставки з піксельними боками — той самий прийом
 * виступаючих смуг, що в IconButton. База 28px, бічна смуга добиває до квадрата 36px.
 * Колір і вміст залежать від стану ціни; disabled блокує клік.
 */
export const BetActionButton: FC<BetActionButtonProps> = ({ variant, onClick }) => {
  const disabled = variant === 'disabled'
  const bg = BG[variant]
  const iconColor = variant === 'remove' ? 'text-white' : 'text-[#323232]'
  const { t } = useT()

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={variant === 'remove' ? t('bet.removeBookedTicketAria') : t('bet.bookTicketAria')}
      className={`relative flex h-9 w-7 items-center justify-center ${bg} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed`}
    >
      <span className={`absolute inset-y-1 -inset-x-1 ${bg}`} aria-hidden="true" />
      <Glyph
        name={variant === 'remove' ? 'times' : 'check'}
        className={`relative z-10 h-5 w-5 ${iconColor}`}
      />
    </button>
  )
}
