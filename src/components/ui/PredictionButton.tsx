import type { FC } from 'react'
import { Link } from 'react-router-dom'

/** Варіант вигляду CTA-кнопки. */
type PredictionButtonVariant = 'primary' | 'inverse'

/** Пропси CTA-кнопки прогнозу. */
interface PredictionButtonProps {
  /** Підпис кнопки (напр. "Make prediction | 00:03:01"). */
  label: string
  /** Маршрут переходу — якщо заданий і не disabled, рендериться як `<Link>`. */
  to?: string
  /** Обробник кліку (для режиму button). */
  onClick?: () => void
  /** Кольорова схема: оранжева (primary) чи біла (inverse). */
  variant?: PredictionButtonVariant
  /** Вимкнений стан: зменшує непрозорість і блокує клік. */
  disabled?: boolean
}

/** Базові класи незалежно від варіанта: розмір, типографіка. */
const baseClass =
  'relative flex h-11 w-full items-center justify-center font-mono text-[16px] font-bold text-[#323232] outline-none'

/** Класи кольору/тіні за варіантом (фон + glow). */
const variantClass: Record<PredictionButtonVariant, string> = {
  primary: 'bg-[#ef9723] shadow-[0_4px_24px_0_rgba(239,151,35,0.5)]',
  inverse: 'bg-white shadow-[0_4px_24px_0_rgba(255,255,255,0.5)]',
}

/** Колір піксельних боків за варіантом. */
const sideColorClass: Record<PredictionButtonVariant, string> = {
  primary: 'bg-[#ef9723]',
  inverse: 'bg-white',
}

/** Піксельні боки (виступ по горизонталі 4px) + підпис поверх. */
const Inner: FC<{ label: string; variant: PredictionButtonVariant }> = ({ label, variant }) => (
  <>
    <span className={`absolute inset-y-1 -inset-x-1 ${sideColorClass[variant]}`} aria-hidden="true" />
    <span className="relative z-10">{label}</span>
  </>
)

/**
 * Акцентна CTA-кнопка з піксельними боками та неоновим світінням.
 * Поліморфна: за наявності `to` (і не disabled) рендерить `<Link>`, інакше `<button>`.
 * Має два варіанти кольору (primary/inverse) та disabled-стан.
 */
export const PredictionButton: FC<PredictionButtonProps> = ({
  label,
  to,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  const className = `${baseClass} ${variantClass[variant]}${disabled ? ' opacity-50' : ''}`

  // У disabled-стані не рендеримо Link (щоб клік не спрацював), а звичайну вимкнену кнопку.
  if (to && !disabled) {
    return (
      <Link to={to} className={className}>
        <Inner label={label} variant={variant} />
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      <Inner label={label} variant={variant} />
    </button>
  )
}
