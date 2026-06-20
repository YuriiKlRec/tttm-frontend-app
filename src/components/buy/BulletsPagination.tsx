import type { FC } from 'react'

/** Пропси пагінації-крапок. */
interface BulletsPaginationProps {
  /** Загальна кількість чеків. */
  count: number
  /** Індекс активного чека. */
  active: number
  /** Перейти до чека за індексом. */
  onSelect: (index: number) => void
}

/**
 * Bullets-пагінація слайдера чеків: ряд крапок, активна — оранжева.
 * Клік по крапці перемикає активний чек.
 */
export const BulletsPagination: FC<BulletsPaginationProps> = ({ count, active, onSelect }) => (
  <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Checks">
    {Array.from({ length: count }, (_, i) => (
      <button
        key={i}
        type="button"
        role="tab"
        aria-selected={i === active}
        aria-label={`Check ${i + 1}`}
        onClick={() => onSelect(i)}
        className={`h-[10px] w-[10px] rounded-full outline-none ${
          i === active ? 'bg-text-focus' : 'bg-white/40'
        }`}
      />
    ))}
  </div>
)
