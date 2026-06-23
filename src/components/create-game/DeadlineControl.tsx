import type { FC } from 'react'
import { FieldLabel } from './FieldLabel'
import { RangeSlider } from './RangeSlider'
import { DateTimeField } from './DateTimeField'
import { formatDuration } from '../../utils/datetime'
import clockIcon from '../../assets/icon-clock.svg'

/** Пропси контролю дедлайну (slider + поле + підпис). */
interface DeadlineControlProps {
  /** Момент дедлайну (epoch ms) — похідний від offset. */
  deadline: number
  /** Поточний offset (хв) до prediction time. */
  offset: number
  /** Нижня межа offset (хв). */
  min: number
  /** Верхня межа offset (хв). */
  max: number
  /** Обробник зміни offset. */
  onChange: (minutes: number) => void
}

/** Оранжева кнопка-thumb із іконкою годинника (як у макеті). */
const ClockThumb: FC = () => (
  <span className="relative flex h-9 w-7 items-center justify-center bg-text-focus" aria-hidden="true">
    <span className="absolute inset-y-1 -inset-x-1 bg-text-focus" />
    <img src={clockIcon} alt="" className="relative z-10 h-4 w-4" />
  </span>
)

/**
 * Контроль дедлайну прийому ставок: слайдер offset (з thumb-годинником),
 * стилізоване поле з моментом дедлайну та підпис «{offset} before prediction time».
 * Слайдер інвертовано: рух праворуч → ближче до prediction time (менший offset).
 */
export const DeadlineControl: FC<DeadlineControlProps> = ({
  deadline,
  offset,
  min,
  max,
  onChange,
}) => {
  // Інверсія: позиція праворуч = ближче до prediction time = менший offset.
  // sliderValue = (min + max) − offset, тож max→min і навпаки.
  const sliderValue = min + max - offset
  const onSlider = (value: number): void => onChange(min + max - value)

  return (
    <div className="flex w-full flex-col gap-3">
      <FieldLabel>Prediction deadline</FieldLabel>
      <RangeSlider
        value={sliderValue}
        min={min}
        max={max}
        onChange={onSlider}
        ariaLabel="Prediction deadline offset"
        thumb={<ClockThumb />}
      />
      <DateTimeField id="deadline" value={deadline} editable={false} />
      <div className="flex w-full flex-col items-center bg-[rgba(255,255,255,0.05)] py-3">
        <span className="font-body text-[12px] text-text-secondary">
          {formatDuration(offset)} before prediction time
        </span>
      </div>
    </div>
  )
}
