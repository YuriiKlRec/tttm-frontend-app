import { Fragment, type FC } from 'react'
import type { DetailGroup } from '../../types/game'
import { useT } from '../../i18n/useT'
import { CurrencyPricePlate } from './CurrencyPricePlate'

/** Спільний клас штрихового розділювача (між групами і між рядками деталей). */
const DIVIDER_CLASS = 'border-t border-dashed border-border-dashed'

/** Пропси вигляду «Details». */
interface DetailsViewProps {
  /** Групи рядків інформації (між групами — штриховий дивайдер). */
  groups: DetailGroup[]
  /** Поточна ціна для плашки курсу. */
  price: string
  /** Показувати плашку курсу (приховано для завершеної гри). */
  showPrice?: boolean
}

/**
 * Вигляд «Details»: фіксований заголовок, скрол-таблиця параметрів гри,
 * розділена на групи штриховими дивайдерами, та плашка курсу внизу.
 */
export const DetailsView: FC<DetailsViewProps> = ({ groups, price, showPrice = true }) => {
  const { t } = useT()

  return (
    <div className="relative flex h-full flex-col">
      <h2 className="bg-background px-6 py-3 font-body text-[15px] font-bold text-text-primary">
        {t('game.gameInformation')}
      </h2>

      <div className="relative flex-1 overflow-y-auto scrollbar-hide px-6 pt-5 pb-12">
        {groups.map((group, groupIndex) => (
          <div
            key={group[0]?.label ?? groupIndex}
            className={groupIndex === 0 ? 'space-y-5' : `mt-5 space-y-5 ${DIVIDER_CLASS} pt-5`}
          >
            {group.map((row, rowIndex) => (
              <Fragment key={row.label}>
                {/* Розділювач між рядками всередині групи — той самий стиль, що між групами. */}
                {rowIndex > 0 ? <div className={DIVIDER_CLASS} aria-hidden="true" /> : null}
                <div className="flex items-start justify-between gap-4">
                  <span className="min-w-0 font-mono text-[15px] text-text-primary">
                    {row.label}
                  </span>
                  {/* Значення (дата тощо) не переноситься на новий рядок; лейбл стискається/переноситься. */}
                  <span className="shrink-0 whitespace-nowrap font-mono text-[15px] font-bold text-text-primary">
                    {row.value}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>
        ))}
      </div>

      {showPrice ? (
        <div className="absolute inset-x-0 bottom-2 mx-3">
          <CurrencyPricePlate price={price} />
        </div>
      ) : null}
    </div>
  )
}
