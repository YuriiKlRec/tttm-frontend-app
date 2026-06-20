import { useRef, useState, type FC, type ReactNode } from 'react'

/** Пропси горизонтального слайдера чеків. */
interface CheckSliderProps {
  /** Кількість слайдів (для синхронізації). */
  count: number
  /** Активний індекс (керується ззовні). */
  activeIndex: number
  /** Зміна активного індексу при свайпі. */
  onIndexChange: (index: number) => void
  /** Слайди (по одному чеку на слайд). */
  children: ReactNode
}

/** Поріг свайпу в частках ширини, після якого перемикаємо слайд. */
const SWIPE_RATIO = 0.2

/**
 * Горизонтальний слайдер на CSS-трансформі з pointer-драгом: трек зсувається на
 * `activeIndex * 100%`, перетягування пальцем/мишею тягне трек і при відпусканні
 * перемикає слайд, якщо зсув перевищив поріг. Працює і на тач, і на десктопі.
 */
export const CheckSlider: FC<CheckSliderProps> = ({
  count,
  activeIndex,
  onIndexChange,
  children,
}) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const widthRef = useRef(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)

  if (count === 1) {
    return <div className="h-full overflow-y-auto px-7 scrollbar-hide">{children}</div>
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    widthRef.current = trackRef.current?.clientWidth ?? 0
    startX.current = e.clientX
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragging) {
      return
    }
    setDrag(e.clientX - startX.current)
  }

  const endDrag = (): void => {
    if (!dragging) {
      return
    }
    const threshold = widthRef.current * SWIPE_RATIO
    if (drag <= -threshold && activeIndex < count - 1) {
      onIndexChange(activeIndex + 1)
    } else if (drag >= threshold && activeIndex > 0) {
      onIndexChange(activeIndex - 1)
    }
    setDrag(0)
    setDragging(false)
  }

  const offset = `calc(${-activeIndex * 100}% + ${drag}px)`

  return (
    <div className="h-full overflow-hidden">
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        className="flex h-full touch-pan-y"
        style={{
          transform: `translateX(${offset})`,
          transition: dragging ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
