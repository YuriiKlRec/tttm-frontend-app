import type { FC } from 'react'

/** Пропси степера онбордингу. */
interface OnboardingStepperProps {
  /** Загальна кількість слайдів (сегментів). */
  total: number
  /** Індекс поточного (активного) слайда. */
  current: number
  /** Прогрес поточного сегмента, 0..1. */
  progress: number
}

/**
 * Прогрес-бар онбордингу: `total` сегментів шириною `flex: 1 0 0`, gap 7px, h-4px.
 * Сегменти з індексом < current — пройдені (суцільний білий). Сегмент == current —
 * база #212121 + білий fill шириною `progress * 100%` (без CSS-анімації: ширина
 * керується пропсом, плавність дає rAF-таймер у useStoryPlayer). Сегменти > current — сірі.
 */
export const OnboardingStepper: FC<OnboardingStepperProps> = ({ total, current, progress }) => (
  <div className="flex w-full gap-[7px]">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className="relative h-1 flex-1 overflow-hidden bg-[#212121]">
        {i < current && <div className="absolute inset-0 bg-white" />}
        {i === current && (
          <div
            className="absolute inset-y-0 left-0 bg-white"
            style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
          />
        )}
      </div>
    ))}
  </div>
)
