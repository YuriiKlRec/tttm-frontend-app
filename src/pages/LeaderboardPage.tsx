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
        /* Список лідерів */
        <ul className="w-full px-7 flex flex-col gap-[2px]">
          {leaders.map((leader) => (
            <LeaderboardRow key={leader.id} leader={leader} isMe={leader.id === user?.id} />
          ))}
        </ul>
      )}
    </>
  )
}

export default LeaderboardPage
