import { useEffect, useRef, useState, type FC } from 'react'
import { PixelCard } from '../ui/PixelCard'
import { PredictionButton } from '../ui/PredictionButton'
import { IconButton } from '../ui/IconButton'
import { Timer } from './Timer'
import { useNow } from '../../hooks/useNow'
import { useAuth } from '../../hooks/useAuth'
import { useT } from '../../i18n/useT'
import { useLocale } from '../../i18n/locale'
import { clamp, formatCountdown } from '../../utils/time'
import { formatInTz } from '../../utils/datetime'
import { formatAmount } from '../../utils/units'
import type { Game } from '../../types/game'
import { gameDeepLink } from '../../utils/gameLink'
import ticketIcon from '../../assets/icon-ticket.svg'
import trophyIcon from '../../assets/icon-trophy.svg'
import linkIcon from '../../assets/icon-link.svg'
import checkIcon from '../../assets/icon-check.svg'

/** Торгова пара, що показується підказкою в кільці таймера (єдина підтримувана зараз). */
const PREDICTION_PAIR = 'BTC/USDT'

/** Тривалість показу іконки-галочки після копіювання посилання (мс). */
const COPY_FEEDBACK_MS = 3000

/** Копіює deep-link на Mini App з id гри у буфер обміну (доступно авторам). */
const copyGameLink = (id: string): boolean => {
  if (!navigator.clipboard) {
    return false
  }
  try {
    void navigator.clipboard.writeText(gameDeepLink(id))
    return true
  } catch {
    // буфер обміну недоступний — мовчазно ігноруємо
    return false
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
  const { t } = useT()
  const locale = useLocale()

  const total = endTime - startTime
  const elapsedFrac = total > 0 ? clamp((now - startTime) / total, 0, 1) : 1
  const betCloseFrac = total > 0 ? clamp((betCloseTime - startTime) / total, 0, 1) : 1

  const bettingClosed = now >= betCloseTime
  const betLabel = bettingClosed
    ? t('game.bettingClosed')
    : t('game.makePrediction', { countdown: formatCountdown(betCloseTime - now) })
  const hasTickets = ticketsCount > 0

  // Підтвердження копіювання: іконка міняється на галочку на 3с, повторний клік
  // перезапускає таймер; таймер чиститься при unmount.
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      if (copyTimeoutRef.current !== undefined) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    },
    [],
  )

  const handleCopyLink = (): void => {
    if (!copyGameLink(id)) return
    setCopied(true)
    if (copyTimeoutRef.current !== undefined) {
      window.clearTimeout(copyTimeoutRef.current)
    }
    copyTimeoutRef.current = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
  }

  return (
    <PixelCard className="mx-7" contentClassName="items-center gap-3 px-7 py-3">
      <div className="flex w-full items-center gap-3">
        <div className="flex flex-1 flex-col items-start gap-[4px]">
          <h2 className="font-body text-[18px] font-bold text-text-primary">{title}</h2>
          <p className="font-mono text-[15px] text-text-primary">{author}</p>
        </div>
        {/* копіювання посилання — доступно авторам; після кліку 3с показує галочку */}
        {isAuthor ? (
          <>
            <IconButton
              icon={copied ? checkIcon : linkIcon}
              label={copied ? t('game.linkCopied') : t('game.copyGameLink')}
              onClick={handleCopyLink}
            />
            <span className="sr-only" role="status" aria-live="polite">
              {copied ? t('game.linkCopied') : ''}
            </span>
          </>
        ) : null}
      </div>

      <Timer
        elapsedFrac={elapsedFrac}
        betCloseFrac={betCloseFrac}
        time={formatCountdown(endTime - now)}
        date={formatInTz(endTime, tz, locale)}
        pair={PREDICTION_PAIR}
      />

      <div className="flex w-full max-w-[270px] items-center justify-between">
        <div className="flex items-center gap-[9px]">
          <span className="relative shrink-0">
            <img src={ticketIcon} alt="" aria-hidden="true" className="w-6" />
            {/* кількість квитків користувача в цій грі — індикатор поруч ціни */}
            {hasTickets ? (
              <span
                aria-hidden="true"
                className="absolute -bottom-1.5 -right-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-text-primary px-0.5 font-mono text-[10px] font-bold leading-none text-surface"
              >
                {ticketsCount}
              </span>
            ) : null}
          </span>
          <span className="font-mono text-[15px] text-text-primary">
            = {formatAmount(ticketPrice)}
            {hasTickets ? (
              <span className="sr-only"> ({t('game.youHaveTickets', { count: ticketsCount })})</span>
            ) : null}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <img src={trophyIcon} alt="" aria-hidden="true" className="h-6 w-6" />
          <span className="font-mono text-[15px] text-text-primary">{formatAmount(prize)}</span>
        </div>
      </div>

      {/* кнопка-посилання на сторінку гри (маршрут /game/:id поки заглушка) */}
      <PredictionButton to={`/game/${id}`} label={betLabel} />
    </PixelCard>
  )
}
