import type { FC } from 'react'
import { useT } from '../../i18n/useT'
import trophyIcon from '../../assets/icon-trophy.svg'
import gamesIcon from '../../assets/icon-games.svg'
import flagIcon from '../../assets/icon-flag.svg'
import ticketIcon from '../../assets/icon-ticket.svg'

/** Пропси блоку статистики профілю гравця. */
interface ProfileStatsProps {
  rewards: string
  gamesCount: number
  winCount: number
  ticketsCount: number
}

/**
 * Блок статистики профілю: нагороди + три лічильники (ігри, перемоги, тікети).
 * Чисто презентаційний — дані через пропси, без запитів.
 */
export const ProfileStats: FC<ProfileStatsProps> = ({
  rewards,
  gamesCount,
  winCount,
  ticketsCount,
}) => {
  const { t } = useT()

  return (
    <div className="flex flex-col gap-4">
      {/* Блок нагород */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] font-bold text-text-secondary">{t('profile.statsRewards')}</span>
        <div className="flex items-center gap-3">
          <img src={trophyIcon} alt="" aria-hidden="true" className="h-6 w-6" />
          <span className="font-mono text-[22px] font-bold text-text-primary">{rewards}</span>
        </div>
      </div>

      {/* Рядок трьох лічильників */}
      <div className="flex items-center gap-6">
        {/* Ігри */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[11px] font-bold text-text-secondary">{t('profile.statsGames')}</span>
          <div className="flex items-center gap-2 bg-[rgba(50,50,50,0.75)] px-2 py-2.5">
            <img src={gamesIcon} alt="" aria-hidden="true" className="h-4 w-4" />
            <span className="font-mono text-[15px] text-text-primary">{gamesCount}</span>
          </div>
        </div>

        {/* Перемоги */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[11px] font-bold text-text-secondary">{t('profile.statsWin')}</span>
          <div className="flex items-center gap-2 bg-[rgba(50,50,50,0.75)] px-2 py-2.5">
            <img src={flagIcon} alt="" aria-hidden="true" className="h-4 w-4" />
            <span className="font-mono text-[15px] text-text-primary">{winCount}</span>
          </div>
        </div>

        {/* Тікети */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[11px] font-bold text-text-secondary">{t('profile.statsTickets')}</span>
          <div className="flex items-center gap-2 bg-[rgba(50,50,50,0.75)] px-2 py-2.5">
            <img src={ticketIcon} alt="" aria-hidden="true" className="h-4 w-4" />
            <span className="font-mono text-[15px] text-text-primary">{ticketsCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
