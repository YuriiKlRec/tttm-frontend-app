import type { FC } from 'react'
import trophyIcon from '../../assets/icon-trophy.svg'
import type { Leader } from '../../types/leaderboard'

interface LeaderboardRowProps {
  /** Дані одного лідера. */
  leader: Leader
  /** true — рядок поточного користувача (підсвічується помаранчевим). */
  isMe: boolean
}

/**
 * Рядок таблиці лідерів: ранг + нік зліва, іконка + кількість перемог справа.
 * Власний рядок підсвічується кольором text-text-focus.
 */
export const LeaderboardRow: FC<LeaderboardRowProps> = ({ leader, isMe }) => {
  const { rank, nickname, wins } = leader
  const valueColor = isMe ? 'text-text-focus' : 'text-text-primary'

  return (
    <li className="bg-surface flex items-center justify-between py-3 pl-2 pr-5">
      {/* Ліва частина: ранг + нік */}
      <div className="flex items-center gap-3">
        <span className="w-5 text-center font-mono text-[15px] font-bold text-text-secondary">
          {rank}
        </span>
        <span className={`font-body text-[15px] font-bold ${valueColor}`}>{nickname}</span>
      </div>

      {/* Права частина: іконка кубка + кількість перемог */}
      <div className="flex items-center gap-2">
        <img src={trophyIcon} className="h-4 w-4" alt="" aria-hidden="true" />
        <span className={`font-mono text-[15px] font-bold ${valueColor}`}>{wins}W</span>
      </div>
    </li>
  )
}
