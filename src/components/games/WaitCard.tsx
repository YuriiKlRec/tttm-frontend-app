import type { FC } from 'react'
import { PixelCard } from '../ui/PixelCard'
import { PredictionButton } from '../ui/PredictionButton'
import { Timer } from './Timer'
import { WaitBetLine } from './WaitBetLine'
import { useNow } from '../../hooks/useNow'
import { clamp, formatCountdown, formatDateTime } from '../../utils/time'
import type { WaitGame } from '../../mocks/waitGames'

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

  const total = endTime - startTime
  const elapsedFrac = total > 0 ? clamp((now - startTime) / total, 0, 1) : 1
  const betCloseFrac = total > 0 ? clamp((betCloseTime - startTime) / total, 0, 1) : 1
  const isLeading = mine.rank === 1

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
        date={formatDateTime(endTime)}
        reward={reward}
      />

      <div className="flex w-full flex-col gap-4">
        {isLeading ? (
          <>
            <WaitBetLine bet={mine} />
            {deviationPercent !== undefined ? (
              <p className="text-center font-body text-[13px] text-text-secondary">
                Your predicted price is{' '}
                <span className="font-bold text-text-focus">{deviationPercent}%</span> away from the
                current market value
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

      <PredictionButton to={`/game/${id}`} label="Show details" />
    </PixelCard>
  )
}
