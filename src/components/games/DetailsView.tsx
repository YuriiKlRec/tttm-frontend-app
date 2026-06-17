import type { FC } from 'react'
import type { DetailGroup } from '../../types/game'
import { CurrencyPricePlate } from './CurrencyPricePlate'

/** Пропси вигляду «Details». */
interface DetailsViewProps {
  /** Групи рядків інформації (між групами — штриховий дивайдер). */
  groups: DetailGroup[]
  /** Поточна ціна для плашки курсу. */
  price: string
}

/**
 * Вигляд «Details»: фіксований заголовок, скрол-таблиця параметрів гри,
 * розділена на групи штриховими дивайдерами, та плашка курсу внизу.
 */
export const DetailsView: FC<DetailsViewProps> = ({ groups, price }) => (
  <div className="relative flex h-full flex-col">
    <h2 className="bg-background px-6 py-3 font-body text-[15px] font-bold text-text-primary">
      Game information
    </h2>

    <div className="relative flex-1 overflow-y-auto scrollbar-hide px-6 pt-5 pb-12">
      {groups.map((group, groupIndex) => (
        <div
          key={group[0]?.label ?? groupIndex}
          className={
            groupIndex === 0
              ? 'space-y-5'
              : 'mt-5 space-y-5 border-t border-dashed border-[rgba(255,255,255,0.25)] pt-5'
          }
        >
          {group.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className="font-mono text-[15px] text-text-primary">{row.label}</span>
              <span className="font-mono text-[15px] font-bold text-text-primary">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>

    <div className="absolute inset-x-0 bottom-2 mx-3">
      <CurrencyPricePlate price={price} />
    </div>
  </div>
)
