import type { FC } from 'react'
import { calcPrizeSplit, calcBreakEven, formatPercent } from '../../utils/prizePool'
import { useT } from '../../i18n/useT'
import starIcon from '../../assets/icon-star.svg'
import rocketIcon from '../../assets/icon-rocket.svg'
import trophyIcon from '../../assets/icon-trophy-muted.svg'

/** Пропси розкладки призового фонду. */
interface PrizeSplitProps {
  /** Host-доля (pool, %). */
  pool: number
  /** Ціна квитка (число) для розрахунку беззбитковості. */
  ticketPrice: number
}

/** Одна колонка розкладки: іконка, підпис, відсоток. */
const Column: FC<{ icon: string; label: string; percent: string; muted?: boolean }> = ({
  icon,
  label,
  percent,
  muted = false,
}) => (
  <div className="flex flex-1 flex-col items-center gap-1.5">
    <img src={icon} alt="" aria-hidden="true" className="h-6 w-6" />
    <span className="text-center font-body text-[12px] text-text-secondary">{label}</span>
    <span
      className={`font-mono text-[15px] font-bold ${muted ? 'text-text-secondary' : 'text-text-primary'}`}
    >
      {percent}
    </span>
  </div>
)

/**
 * Розкладка призового фонду у три колонки (Host / Platform / Winner)
 * та підпис із точкою беззбитковості хоста.
 */
export const PrizeSplit: FC<PrizeSplitProps> = ({ pool, ticketPrice }) => {
  const { t } = useT()
  const split = calcPrizeSplit(pool)
  const breakEven = calcBreakEven(ticketPrice, pool)

  return (
    <div className="flex w-full flex-col items-center gap-1.5 bg-[rgba(255,255,255,0.05)] py-3">
      <div className="flex w-full gap-3 px-7 py-2">
        <Column icon={starIcon} label={t('createGame.splitHost')} percent={formatPercent(split.host)} />
        <Column icon={rocketIcon} label={t('createGame.splitPlatform')} percent={formatPercent(split.platform)} muted />
        <Column icon={trophyIcon} label={t('createGame.splitWinner')} percent={formatPercent(split.winner)} muted />
      </div>
      <div className="h-px w-full border-t border-dashed border-border-dashed" />
      <span className="text-center font-body text-[12px] text-text-secondary">
        {t('createGame.breakEven', { count: breakEven ?? '—' })}
      </span>
    </div>
  )
}
