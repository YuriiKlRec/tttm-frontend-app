import type { FC } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuth } from '../hooks/useAuth'
import { LeaderboardRow } from '../components/leaderboard/LeaderboardRow'
import { PixelCard } from '../components/ui/PixelCard'
import { useT } from '../i18n/useT'
import trophyIcon from '../assets/icon-trophy.svg'

/**
 * Вкладка Leaders: таблиця лідерів із виділенням власного рядка.
 * Рендериться всередині AppLayout — без власного shell/topbar/footer.
 * Порожній стан показується лише після першого завантаження (loading guard).
 */
const LeaderboardPage: FC = () => {
  const { leaders, loading } = useLeaderboard()
  const { user } = useAuth()
  const { t } = useT()

  // Чекаємо першого завантаження — уникаємо flash порожнього стану
  if (loading && leaders.length === 0) {
    return null
  }

  return (
    <>
      <h1 className="font-display text-[24px] text-text-primary">{t('leaderboard.title')}</h1>

      {leaders.length === 0 ? (
        /* Порожній стан */
        <PixelCard className="mx-7" contentClassName="items-center justify-center gap-3 px-6 py-[104px]">
          <img src={trophyIcon} className="h-6 w-6" alt="" aria-hidden="true" />
          <p className="w-36 text-center font-body text-[15px] text-text-primary">
            {t('leaderboard.empty')}
          </p>
        </PixelCard>
      ) : (
        /* Заголовки колонок + список лідерів (Figma 1655:18169) */
        <div className="w-full px-7 flex flex-col gap-[2px]">
          <div
            aria-hidden="true"
            className="flex items-center justify-between pb-2 pl-2 pr-5 font-mono text-[13px] text-text-secondary"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-center">№</span>
              <span>{t('leaderboard.colPlayer')}</span>
            </div>
            <span>{t('leaderboard.colWins')}</span>
          </div>
          <ul className="flex flex-col gap-[2px]">
            {leaders.map((leader) => (
              <LeaderboardRow key={leader.id} leader={leader} isMe={leader.id === user?.id} />
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export default LeaderboardPage
