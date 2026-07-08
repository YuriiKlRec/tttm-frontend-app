import type { FC, ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Пропси оранжевої icon-only кнопки. */
interface IconButtonProps {
  /** Шлях до SVG-іконки (16x16). */
  icon: string
  /** Текст для aria-label — обов'язковий, бо кнопка icon-only. */
  label: string
  /** Режим рендеру: button (за замовчуванням) або react-router Link. */
  as?: 'button' | 'link'
  /** Обробник кліку (для button). */
  onClick?: () => void
  /** Маршрут переходу (для link). */
  to?: string
  /** Розмір іконки: 'md' (20px, за замовчуванням) або 'sm' (16px, як у topbar за макетом). */
  iconSize?: 'md' | 'sm'
}

/** Спільні класи: оранжевий фон, фіксований розмір, flex-центр, focus-visible. */
const baseClass =
  'relative flex h-9 w-7 items-center justify-center bg-[#ef9723] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

/** Класи розміру іконки за `iconSize`. */
const iconSizeClass: Record<'md' | 'sm', string> = {
  md: 'h-5 w-5',
  sm: 'h-4 w-4',
}

/** Піксельні боки (виступ 4px по горизонталі) + центрована іконка. */
const renderInner = (icon: string, iconSize: 'md' | 'sm'): ReactNode => (
  <>
    <span className="absolute inset-y-1 -inset-x-1 bg-[#ef9723]" aria-hidden="true" />
    <img src={icon} alt="" aria-hidden="true" className={`relative z-10 ${iconSizeClass[iconSize]}`} />
  </>
)

/**
 * Поліморфна оранжева icon-only кнопка з піксельними боками (стиль topbar/card).
 * За `as="link"` рендерить react-router `<Link>`, інакше `<button type="button">`.
 */
export const IconButton: FC<IconButtonProps> = ({
  icon,
  label,
  as = 'button',
  onClick,
  to,
  iconSize = 'md',
}) => {
  if (as === 'link' && to) {
    return (
      <Link to={to} aria-label={label} className={baseClass}>
        {renderInner(icon, iconSize)}
      </Link>
    )
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={baseClass}>
      {renderInner(icon, iconSize)}
    </button>
  )
}
