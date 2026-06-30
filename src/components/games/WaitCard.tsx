import type { FC } from 'react'
import { PixelCard } from '../ui/PixelCard'
import { PredictionButton } from '../ui/PredictionButton'
import { Timer } from './Timer'
import { WaitBetLine } from './WaitBetLine'
import { useNow } from '../../hooks/useNow'
import { useAuth } from '../../hooks/useAuth'
import { useT } from '../../i18n/useT'
import { useLocale } from '../../i18n/locale'
import { clamp, formatCountdown } from '../../utils/time'
import { formatInTz } from '../../utils/datetime'
import type { WaitGame } from '../../types/wait'

/**
 * Картка гри на вкладці Waiting: заголовок, кільце-таймер із винагородою та
 * відліком до фіналізації, короткий рейтинг ставок і кнопка деталей.
 * Два стани: користувач лідирує (один рядок + відхилення від ринку) або ні
 * (рядок лідера + власна ставка).
 */
export const WaitCard: FC<WaitGame> = ({
  id,
  title,
  author,
  reward,
  startTime,
  betCloseTime,
  endTime,
  leader,
  mine,
  deviationPercent,
}) => {
  const now = useNow()
  const { tz } = useAuth()
  const { t } = useT()
  const locale = useLocale()

  const total = endTime - startTime
  const elapsedFrac = total > 0 ? clamp((now - startTime) / total, 0, 1) : 1
  const betCloseFrac = total > 0 ? clamp((betCloseTime - startTime) / total, 0, 1) : 1
  const isLeading = mine.rank === 1

  // Sentinel-підхід: отримуємо шаблон без інтерполяції і розбиваємо по {{percent}}
  const deviationTpl = t('game.yourPredictedPrice')
  const [devBefore, devAfter] = deviationTpl.split('{{percent}}')

  return (
    <PixelCard className="mx-7" contentClassName="items-center gap-4 px-7 py-4">
      <div className="flex w-full flex-col items-start gap-[3px]">
        <h2 className="font-body text-[18px] font-bold text-text-primary">{title}</h2>
        <p className="font-mono text-[15px] text-text-primary">{author}</p>
      </div>

      <Timer
        elapsedFrac={elapsedFrac}
        betCloseFrac={betCloseFrac}
        time={formatCountdown(endTime - now)}
        date={formatInTz(endTime, tz, locale)}
        reward={reward}
      />

      <div className="flex w-full flex-col gap-4">
        {isLeading ? (
          <>
            <WaitBetLine bet={mine} />
            {deviationPercent !== undefined ? (
              <p className="text-center font-body text-[13px] text-text-secondary">
                {devBefore}<span className="font-bold text-text-focus">{deviationPercent}</span>{devAfter}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <WaitBetLine bet={leader} />
            <div
              className="w-full border-t border-dashed border-border-dashed"
              aria-hidden="true"
            />
            <WaitBetLine bet={mine} />
          </>
        )}
      </div>

      <PredictionButton to={`/game/${id}`} label={t('game.showDetails')} />
    </PixelCard>
  )
}
