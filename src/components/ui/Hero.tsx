import type { FC } from 'react'
import { CurrencyChip } from './CurrencyChip'

/** Hero-блок: заголовок гри, підзаголовок та валютний чип. */
export const Hero: FC = () => (
  <section className="flex w-full max-w-[340px] flex-col items-center gap-4 px-2">
    <div className="flex flex-col items-center gap-3">
      <h1 className="text-center font-display text-2xl uppercase leading-tight text-text-primary">
        Prediction games
      </h1>
      <p className="text-center text-base text-text-secondary">
        What price will be when timer ends?
      </p>
    </div>
    <CurrencyChip />
  </section>
)
