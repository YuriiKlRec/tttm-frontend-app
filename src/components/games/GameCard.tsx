import type { FC } from 'react'
import { PixelCard } from '../ui/PixelCard'
import { PredictionButton } from '../ui/PredictionButton'
import { IconButton } from '../ui/IconButton'
import { Timer } from './Timer'
import { useNow } from '../../hooks/useNow'
import { useAuth } from '../../hooks/useAuth'
import { clamp, formatCountdown } from '../../utils/time'
import { formatInTz } from '../../utils/datetime'
import type { Game } from '../../types/game'
import { gameDeepLink } from '../../utils/gameLink'
import ticketIcon from '../../assets/icon-ticket.svg'
import trophyIcon from '../../assets/icon-trophy.svg'
import linkIcon from '../../assets/icon-link.svg'

/** Копіює deep-link на Mini App з id гри у буфер обміну (доступно авторам). */
const copyGameLink = (id: string): void => {
  if (!navigator.clipboard) {
    return
  }
  try {
    void navigator.clipboard.writeText(gameDeepLink(id))
  } catch {
    // буфер обміну недоступний — мовчазно ігноруємо
  }
}

/** Картка гри-прогнозу: заголовок, таймлайн-таймер, статистика, кнопка прогнозу. */
export const GameCard: FC<Game> = ({
  id,
  title,
  author,
  ticketPrice,
  prize,
  ticketsCount,
  startTime,
  betCloseTime,
  endTime,
  isAuthor,
}) => {
  const now = useNow()
  const { tz } = useAuth()

  const total = endTime - startTime
  const elapsedFrac = total > 0 ? clamp((now - startTime) / total, 0, 1) : 1
  const betCloseFrac = total > 0 ? clamp((betCloseTime - startTime) / total, 0, 1) : 1

  const bettingClosed = now >= betCloseTime
  const betLabel = bettingClosed
    ? 'Betting closed'
    : `Make prediction | ${formatCountdown(betCloseTime - now)}`

  return (
    <PixelCard className="mx-7" contentClassName="items-center gap-3 px-7 py-4">
      <div className="flex w-full items-center gap-3">
        <div className="flex flex-1 flex-col items-start gap-[3px]">
          <h2 className="font-body text-[18px] font-bold text-text-primary">{title}</h2>
          <p className="font-mono text-[15px] text-text-primary">{author}</p>
        </div>
        {/* копіювання посилання — доступно авторам */}
        {isAuthor ? (
          <IconButton icon={linkIcon} label="Copy game link" onClick={() => copyGameLink(id)} />
        ) : null}
      </div>

      <Timer
        elapsedFrac={elapsedFrac}
        betCloseFrac={betCloseFrac}
        time={formatCountdown(endTime - now)}
        date={formatInTz(endTime, tz)}
      />

      <div className="flex w-full max-w-[270px] items-center justify-between">
        <div className="flex items-center gap-[9px]">
          <img src={ticketIcon} alt="" aria-hidden="true" className="w-6" />
          <span className="font-mono text-[15px] text-text-primary">= {ticketPrice} TON</span>
        </div>
        <div className="flex items-center gap-2">
          <img src={trophyIcon} alt="" aria-hidden="true" className="h-6 w-6" />
          <span className="font-mono text-[15px] text-text-primary">{prize} TON</span>
        </div>
      </div>

      {/* кнопка-посилання на сторінку гри (маршрут /game/:id поки заглушка) */}
      <PredictionButton to={`/game/${id}`} label={betLabel} />

      <p className="font-body text-[15px] text-text-focus">You have {ticketsCount} tickets</p>
    </PixelCard>
  )
}
