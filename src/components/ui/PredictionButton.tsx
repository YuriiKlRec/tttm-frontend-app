import type { FC } from 'react'
import { Link } from 'react-router-dom'

/** Пропси оранжевої кнопки прогнозу. */
interface PredictionButtonProps {
  /** Підпис кнопки (напр. "Make prediction | 00:03:01"). */
  label: string
  /** Маршрут переходу — якщо заданий, рендериться як `<Link>`. */
  to?: string
  /** Обробник кліку (для режиму button). */
  onClick?: () => void
}

/** Спільні класи вигляду: action-фон, неонове світіння, mono bold, focus-visible. */
const baseClass =
  'relative flex h-11 w-full items-center justify-center bg-[#ef9723] font-mono text-[16px] font-bold text-[#323232] shadow-[0_4px_24px_0_rgba(239,151,35,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

/** Піксельні боки (виступ по горизонталі 4px) + підпис поверх. */
const Inner: FC<{ label: string }> = ({ label }) => (
  <>
    <span className="absolute inset-y-1 -inset-x-1 bg-[#ef9723]" aria-hidden="true" />
    <span className="relative z-10">{label}</span>
  </>
)

/**
 * Акцентна (action) кнопка прогнозу з піксельними боками та неоновим світінням.
 * Поліморфна: за наявності `to` рендерить react-router `<Link>`, інакше `<button>`.
 */
export const PredictionButton: FC<PredictionButtonProps> = ({ label, to, onClick }) => {
  if (to) {
    return (
      <Link to={to} className={baseClass}>
        <Inner label={label} />
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      <Inner label={label} />
    </button>
  )
}
