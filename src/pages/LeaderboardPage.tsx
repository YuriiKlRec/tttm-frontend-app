import type { FC } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuth } from '../hooks/useAuth'
import { LeaderboardRow } from '../components/leaderboard/LeaderboardRow'
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
        <div className="w-full px-7">
          <div className="bg-surface flex flex-col items-center justify-center gap-2 py-10">
            <img src={trophyIcon} className="h-6 w-6" alt="" aria-hidden="true" />
            <p className="font-body text-center text-[15px] text-text-secondary">
              {t('leaderboard.empty')}
            </p>
          </div>
        </div>
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
