import { useId, type FC, type ReactNode } from 'react'

/** Пропси базового горизонтального слайдера. */
interface RangeSliderProps {
  /** Поточне значення. */
  value: number
  /** Мінімум. */
  min: number
  /** Максимум. */
  max: number
  /** Крок (за замовчуванням 1). */
  step?: number
  /** Обробник зміни. */
  onChange: (value: number) => void
  /** Доступний підпис для скрінрідерів. */
  ariaLabel: string
  /** Кастомний thumb (напр. кнопка-годинник); інакше — квадратний за замовчуванням. */
  thumb?: ReactNode
  /**
   * З якого боку зафарбовується прогрес: 'left' (за замовчуванням) — від початку
   * до thumb (як у слайдера відсотків), 'right' — від thumb до кінця
   * (слайдер дедлайну: білий/сірий зліва, жовтий справа).
   */
  fillSide?: 'left' | 'right'
}

/** Частка заповнення [0..1] для позиціонування selected/thumb. */
const fraction = (value: number, min: number, max: number): number => {
  if (max <= min) return 1
  return (value - min) / (max - min)
}

/**
 * Горизонтальний слайдер у стилі макета: сіра доріжка, оранжева заповнена
 * частина та квадратний thumb. Нативний `<input type="range">` лежить зверху
 * прозорим шаром для доступності/керування (клавіатура, тач).
 */
export const RangeSlider: FC<RangeSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  thumb,
  fillSide = 'left',
}) => {
  const id = useId()
  const percent = fraction(value, min, max) * 100
  const isLeft = fillSide === 'left'

  return (
    <div className="relative h-9 w-full">
      {/* доріжка (сіра/біла база на всю ширину) */}
      <div className="absolute top-1/2 left-0 h-1 w-full -translate-y-1/2 bg-[#d9d9d9]" />
      {/* заповнена частина: 'left' — від початку до thumb, 'right' — від thumb до кінця */}
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 bg-text-focus"
        style={
          isLeft
            ? { left: 0, width: `${percent}%` }
            : { right: 0, width: `${100 - percent}%` }
        }
      />
      {/* thumb */}
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${percent}%` }}
      >
        {thumb ?? (
          <span className="block size-6 border-4 border-background bg-text-focus" aria-hidden="true" />
        )}
      </div>
      {/* Нативний range лежить прозорим шаром поверх; -inset-y-2 розширює зону
          тапу/кліку (≥44px по висоті) поза межі видимої доріжки, не змінюючи
          візуальний розмір слайдера. */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={ariaLabel}
        className="absolute inset-x-0 -inset-y-2 h-[calc(100%+16px)] w-full cursor-pointer opacity-0"
      />
    </div>
  )
}
