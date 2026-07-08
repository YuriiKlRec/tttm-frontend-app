import type { FC } from 'react'
import { formatUsd } from '../../utils/price'
import { useT } from '../../i18n/useT'
import type { TicketStatus } from '../../types/buyTickets'
import timesIcon from '../../assets/icon-times.svg'
import plusIcon from '../../assets/icon-step-plus.svg'
import infoIcon from '../../assets/icon-info-circle.svg'

/** Ціна одного квитка в GRAM (показується в рядку). */
const ROW_TON = '0.1 GRAM'

/** Пропси рядка ставки. */
interface TicketRowProps {
  /** Ціна прогнозу (USD). */
  price: number
  /** Стан ставки. */
  status: TicketStatus
  /** Перемкнути active ↔ inactive (для active/inactive). */
  onToggle: () => void
  /** Відкрити модалку ALREADY TAKEN (для taken). */
  onInfo: () => void
}

/** Класи ціни за станом (колір + закреслення). */
const priceClass: Record<TicketStatus, string> = {
  active: 'text-text-primary',
  inactive: 'text-[#6e6e6e] line-through',
  taken: 'text-[#e5484d] line-through',
}

/**
 * Рядок заброньованої ставки. Три стани:
 * - active: біла ціна, «0.1 GRAM», дія ✕ (зробити inactive);
 * - inactive: сіра закреслена ціна/GRAM, дія + (повернути в active);
 * - taken: червона закреслена ціна, «Already taken», дія ℹ (модалка).
 */
export const TicketRow: FC<TicketRowProps> = ({ price, status, onToggle, onInfo }) => {
  const { t } = useT()

  return (
    <li className="flex items-center justify-between px-7">
      <span className={`font-mono text-[18px] font-bold ${priceClass[status]}`}>
        {formatUsd(price)}
      </span>

      {status === 'taken' ? (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] font-bold text-[#e5484d]">{t('buy.alreadyTakenInline')}</span>
          <button
            type="button"
            aria-label={t('buy.whyTakenAria', { price: formatUsd(price) })}
            onClick={onInfo}
            className="flex h-4 w-4 items-center justify-center outline-none"
          >
            <img src={infoIcon} alt="" aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-[13px] font-bold ${
              status === 'inactive' ? 'text-[#6e6e6e] line-through' : 'text-text-primary'
            }`}
          >
            {ROW_TON}
          </span>
          <button
            type="button"
            aria-label={
              status === 'active'
                ? t('buy.skipPredictionAria', { price: formatUsd(price) })
                : t('buy.restorePredictionAria', { price: formatUsd(price) })
            }
            onClick={onToggle}
            className="flex h-4 w-4 items-center justify-center outline-none"
          >
            <img
              src={status === 'active' ? timesIcon : plusIcon}
              alt=""
              aria-hidden="true"
              className="h-4 w-4"
            />
          </button>
        </div>
      )}
    </li>
  )
}
