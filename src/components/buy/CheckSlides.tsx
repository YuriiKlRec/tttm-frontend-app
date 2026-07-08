import type { FC } from 'react'
import { CheckSlider } from './CheckSlider'
import { TicketCheck } from './TicketCheck'
import { CheckSuccess } from './CheckSuccess'
import type { UseTicketChecks } from '../../hooks/useTicketChecks'

/** Пропси області слайдів чеків. */
interface CheckSlidesProps {
  /** Стан чеків. */
  checks: UseTicketChecks
  /** Відкрити модалку ALREADY TAKEN. */
  onTicketInfo: () => void
}

/**
 * Класи слайда у багаточековому режимі (на всю ширину, вертикальний скрол).
 * pb-6 — додатковий відступ знизу скрол-області: без нього тло чека (з
 * піксельними зубцями знизу) впритул торкається закріпленого нижнього блока
 * (CheckActionPanel) в кінці скролу — обидва мають однаковий bg-surface, тож
 * межа між ними губиться. Відступ дає видимий проміжок кольору фону сторінки.
 */
const SLIDE_CLASS =
  'h-full w-full shrink-0 select-none overflow-y-auto px-7 pb-6 scrollbar-hide'

/**
 * Область слайдів: для кожного чека показує тіло (TicketCheck) або success
 * (CheckSuccess, якщо paid). У режимі >1 чека загорнуто у scroll-snap слайдер.
 */
export const CheckSlides: FC<CheckSlidesProps> = ({ checks, onTicketInfo }) => {
  const multi = checks.checks.length > 1

  return (
    <CheckSlider
      count={checks.checks.length}
      activeIndex={checks.activeIndex}
      onIndexChange={checks.goToCheck}
    >
      {checks.checks.map((check, checkIndex) => {
        const summary = checks.summaryOf(check)
        const body =
          check.status === 'paid' ? (
            <CheckSuccess prices={summary.activePrices} />
          ) : (
            <TicketCheck
              check={check}
              summary={summary}
              onToggleTicket={(ti) => checks.toggleTicket(checkIndex, ti)}
              onTicketInfo={onTicketInfo}
            />
          )
        return multi ? (
          <div key={checkIndex} className={SLIDE_CLASS}>
            <div className="pt-3">{body}</div>
          </div>
        ) : (
          <div key={checkIndex} className="pt-3">
            {body}
          </div>
        )
      })}
    </CheckSlider>
  )
}
