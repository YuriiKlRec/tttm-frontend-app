import type { FC } from 'react'
import { FieldLabel } from './FieldLabel'
import { RangeSlider } from './RangeSlider'
import { PrizeSplit } from './PrizeSplit'
import { POOL_MIN, POOL_MAX } from '../../utils/prizePool'

/** Пропси контролю призового фонду. */
interface PrizePoolControlProps {
  /** Host-доля (pool, %). */
  pool: number
  /** Обробник зміни pool. */
  onChange: (value: number) => void
  /** Ціна квитка (число) для розрахунку беззбитковості. */
  ticketPrice: number
}

/**
 * Контроль призового фонду: слайдер host-долі [5..30]% та розкладка
 * Host/Platform/Winner із точкою беззбитковості.
 */
export const PrizePoolControl: FC<PrizePoolControlProps> = ({ pool, onChange, ticketPrice }) => (
  <div className="flex w-full flex-col gap-3">
    <FieldLabel>Prize pool</FieldLabel>
    <RangeSlider
      value={pool}
      min={POOL_MIN}
      max={POOL_MAX}
      onChange={onChange}
      ariaLabel="Prize pool host share"
    />
    <PrizeSplit pool={pool} ticketPrice={ticketPrice} />
  </div>
)
