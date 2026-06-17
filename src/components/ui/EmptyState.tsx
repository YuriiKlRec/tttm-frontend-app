import type { FC } from 'react'
import { PixelCard } from './PixelCard'
import ticketIcon from '../../assets/icon-ticket.svg'
import moon from '../../assets/moon.png'

/**
 * Порожній стан списку ігор: surface-карта (PixelCard) з іконкою-квитком та текстом.
 * Місяць рендериться абсолютно по центру-знизу позаду картки — видно лише тут,
 * бо EmptyState показується тільки за відсутності ігор.
 */
export const EmptyState: FC = () => (
  <>
    <img
      src={moon}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-1/2 w-[168px] -translate-x-1/2"
    />
    <PixelCard
      className="mx-7"
      contentClassName="items-center justify-center gap-3 px-6 py-[104px]"
    >
      <img src={ticketIcon} alt="" aria-hidden="true" className="w-6" />
      <p className="w-36 text-center text-[15px] text-text-primary">
        New games will be here soon
      </p>
    </PixelCard>
  </>
)
