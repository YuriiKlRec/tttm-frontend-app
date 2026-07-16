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
  /** Вимкнений стан: сіра кнопка без світіння, клік заблоковано. */
  disabled?: boolean
}

/** Базові класи незалежно від варіанта: розмір, типографіка. */
const baseClass =
  'relative flex h-11 w-full items-center justify-center font-mono text-[16px] font-bold outline-none'

/** Класи фону/тіні/тексту за варіантом (активний стан). Текст — action/primary/on-action, збігається з --color-surface. */
const variantClass: Record<PredictionButtonVariant, string> = {
  primary: 'bg-[#ef9723] text-surface shadow-[0_4px_24px_0_rgba(239,151,35,0.5)]',
  inverse: 'bg-white text-surface shadow-[0_4px_24px_0_rgba(255,255,255,0.5)]',
}

/** Колір піксельних боків за варіантом (активний стан). */
const sideColorClass: Record<PredictionButtonVariant, string> = {
  primary: 'bg-[#ef9723]',
  inverse: 'bg-white',
}

/** Сіра схема вимкненої кнопки (фон + текст), без світіння. Фон — grey/700 (#323232, новий тон з палітри), окремого токена нема (єдине використання, не hover). */
const DISABLED_CLASS = 'bg-[#323232] text-[#6e6e6e]'
/** Колір боків вимкненої кнопки. */
const DISABLED_SIDE = 'bg-[#323232]'

/** Піксельні боки (виступ по горизонталі 4px) + підпис поверх. */
const Inner: FC<{ label: string; sideColor: string }> = ({ label, sideColor }) => (
  <>
    <span className={`absolute inset-y-1 -inset-x-1 ${sideColor}`} aria-hidden="true" />
    <span className="relative z-10">{label}</span>
  </>
)

/**
 * Акцентна CTA-кнопка з піксельними боками та неоновим світінням.
 * Поліморфна: за наявності `to` (і не disabled) рендерить `<Link>`, інакше `<button>`.
 * Має два варіанти кольору (primary/inverse) та сірий disabled-стан.
 */
export const PredictionButton: FC<PredictionButtonProps> = ({
  label,
  to,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  const className = `${baseClass} ${disabled ? DISABLED_CLASS : variantClass[variant]}`
  const sideColor = disabled ? DISABLED_SIDE : sideColorClass[variant]

  // У disabled-стані не рендеримо Link (щоб клік не спрацював), а звичайну вимкнену кнопку.
  if (to && !disabled) {
    return (
      <Link to={to} className={className}>
        <Inner label={label} sideColor={sideColor} />
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      <Inner label={label} sideColor={sideColor} />
    </button>
  )
}
