import type { FC } from 'react'
import { useT } from '../../i18n/useT'
import trophyIcon from '../../assets/icon-trophy.svg'
import ticketIcon from '../../assets/icon-ticket.svg'
import ticketRedIcon from '../../assets/icon-ticket-red.svg'
import userIcon from '../../assets/icon-user.svg'

/** Пропси рядка статистики гри. */
interface PredictionStatsProps {
  /** Призовий фонд (напр. "2.4 GRAM"). */
  reward: string
  /** Кількість усіх зайнятих квитків (напр. "24"). */
  ticketsTaken: string
  /** Кількість квитків користувача (напр. "2"). */
  ticketsMine: string
  /** Кількість гравців (напр. "11"). */
  players: string
}

/** Обгортка значення статистики (темний бокс із вмістом). */
const StatBox: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="bg-surface/75 px-2 py-2.5">
    <span className="flex items-center gap-2">{children}</span>
  </span>
)

/** Підпис над значенням статистики. */
const StatLabel: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-mono text-[11px] font-bold text-text-secondary">{children}</span>
)

/** Числове значення статистики. */
const StatValue: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-mono text-[15px] text-text-primary">{children}</span>
)

/**
 * Фіксований рядок статистики гри для вигляду «Predictions»:
 * Reward (трофей), Tickets (усі + свої), Players (гравці).
 */
export const PredictionStats: FC<PredictionStatsProps> = ({
  reward,
  ticketsTaken,
  ticketsMine,
  players,
}) => {
  const { t } = useT()

  return (
    <div className="flex gap-6 px-6 py-3">
      <span className="flex flex-col items-start gap-3">
        <StatLabel>{t('predictions.statsReward')}</StatLabel>
        <StatBox>
          <img src={trophyIcon} alt="" aria-hidden="true" className="h-4 w-4" />
          <StatValue>{reward}</StatValue>
        </StatBox>
      </span>

      <span className="flex flex-col items-start gap-3">
        <StatLabel>{t('predictions.statsTickets')}</StatLabel>
        <StatBox>
          <span className="flex items-center gap-[9px]">
            <span className="flex items-center gap-2">
              <img src={ticketRedIcon} alt="" aria-hidden="true" className="h-4 w-4" />
              <StatValue>{ticketsTaken}</StatValue>
            </span>
            <span className="h-3 w-px bg-[rgba(255,255,255,0.25)]" aria-hidden="true" />
            <span className="flex items-center gap-2">
              <img src={ticketIcon} alt="" aria-hidden="true" className="h-4 w-4" />
              <StatValue>{ticketsMine}</StatValue>
            </span>
          </span>
        </StatBox>
      </span>

      <span className="flex flex-col items-start gap-3">
        <StatLabel>{t('predictions.statsPlayers')}</StatLabel>
        <StatBox>
          <img src={userIcon} alt="" aria-hidden="true" className="h-4 w-4" />
          <StatValue>{players}</StatValue>
        </StatBox>
      </span>
    </div>
  )
}
