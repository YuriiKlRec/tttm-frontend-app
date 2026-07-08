import type { FC } from 'react'
import { FieldLabel } from './FieldLabel'
import { RangeSlider } from './RangeSlider'
import { DateTimeField } from './DateTimeField'
import { useT } from '../../i18n/useT'
import { formatDuration, MINUTE_MS } from '../../utils/datetime'
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
 * Контроль дедлайну прийому ставок: підпис «{offset} before prediction time»,
 * стилізоване поле з моментом дедлайну (тепер редаговане — той самий датапікер,
 * що й у поля prediction time) та слайдер offset (з thumb-годинником) під ним.
 * Слайдер інвертовано: рух праворуч → ближче до prediction time (менший offset).
 * Поле дати й слайдер синхронізовані двобічно через спільний offset у батьківському стані.
 */
export const DeadlineControl: FC<DeadlineControlProps> = ({
  deadline,
  offset,
  min,
  max,
  onChange,
}) => {
  const { t } = useT()
  // Інверсія: позиція праворуч = ближче до prediction time = менший offset.
  // sliderValue = (min + max) − offset, тож max→min і навпаки.
  const sliderValue = min + max - offset
  const onSlider = (value: number): void => onChange(min + max - value)

  // predictionTime відновлюємо з deadline + offset (обидва похідні з нього в батьку).
  const predictionTime = deadline + offset * MINUTE_MS
  // Межі дати пікера — дзеркало меж offset-слайдера.
  const dateMin = predictionTime - max * MINUTE_MS
  const dateMax = predictionTime - min * MINUTE_MS

  const onDateChange = (epochMs: number): void => {
    const minutes = Math.round((predictionTime - epochMs) / MINUTE_MS)
    onChange(minutes)
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <FieldLabel htmlFor="deadline">{t('createGame.predictionDeadlineLabel')}</FieldLabel>
      <div className="flex w-full flex-col items-center bg-[rgba(255,255,255,0.05)] py-3">
        <span className="font-body text-[12px] text-text-secondary">
          {t('createGame.beforePredictionTime', { duration: formatDuration(offset) })}
        </span>
      </div>
      <DateTimeField
        id="deadline"
        value={deadline}
        onChange={onDateChange}
        min={dateMin}
        max={dateMax}
      />
      <RangeSlider
        value={sliderValue}
        min={min}
        max={max}
        onChange={onSlider}
        ariaLabel={t('createGame.deadlineOffsetAria')}
        thumb={<ClockThumb />}
        fillSide="right"
      />
    </div>
  )
}
