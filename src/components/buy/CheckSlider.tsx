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
    // pb-10 — див. коментар до SLIDE_CLASS у CheckSlides.tsx: без нього тло
    // чека впритул торкався б нижньої панелі в кінці скролу.
    return <div className="h-full overflow-y-auto px-7 pb-10 scrollbar-hide">{children}</div>
  }

  // Захоплюємо вказівник на pointerdown: без цього браузер веде hit-test за
  // ФІЗИЧНОЮ позицією курсора/пальця, і природний вертикальний дрейф пальця
  // під час горизонтального свайпу (типово поруч із закріпленим нижнім
  // блоком) виводить курсор за межі треку — спрацьовує onPointerLeave,
  // передчасно завершуючи драг (миттєвий стрибок трансформи + подальші
  // pointermove вже ігноруються, бо dragging=false — жест «вмирає» до
  // відпускання пальця). Це і є корінь дьоргання при свайпі чеків.
  // setPointerCapture прив'язує ВСІ наступні події цього pointerId до треку
  // незалежно від фізичної позиції — межові події (leave/out) більше не
  // спрацьовують передчасно, жест лишається плавним аж до pointerup/cancel.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
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

  const endDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragging) {
      return
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
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
