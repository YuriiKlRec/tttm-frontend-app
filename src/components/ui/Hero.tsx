import type { FC } from 'react'
import { useT } from '../../i18n/useT'

/** Hero-блок: заголовок сторінки ігор. */
export const Hero: FC = () => {
  const { t } = useT()

  return (
    <section className="flex w-full max-w-[340px] flex-col items-center gap-4 px-2">
      <h1 className="text-center font-display text-2xl uppercase leading-tight text-text-primary">
        {t('predictions.heroTitle')}
      </h1>
    </section>
  )
}
