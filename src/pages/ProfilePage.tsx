import { type FC } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ProfileStats } from '../components/profile/ProfileStats'
import { GameHistoryList } from '../components/profile/GameHistoryList'
import { PlayerPatternPanel } from '../components/profile/PlayerPatternPanel'
import { useProfile } from '../hooks/useProfile'
import { useT } from '../i18n/useT'

/**
 * Сторінка перегляду профілю `/profile` (read-only).
 *
 * Структура:
 *   - Прокручуваний контент: заголовок (@nick + посилання Edit),
 *     блок статистики, розділювач, список останніх ігор.
 *   - Фіксований футер: PlayerPatternPanel з кнопкою «Go back».
 *
 * Під час завантаження рендерить порожній fullscreen-shell без flash-контенту.
 */
const ProfilePage: FC = () => {
  const navigate = useNavigate()
  const { profile, loading } = useProfile()
  const { t } = useT()

  /** Обробник кнопки «Go back» у PlayerPatternPanel. */
  const handleGoBack = (): void => {
    navigate(-1)
  }

  // Під час завантаження або відсутності профілю — порожній shell (без flash)
  if (loading || !profile) {
    return (
      <div className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
        <div className="flex-1" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
      {/* Фіксована шапка: нік + посилання на редагування */}
      <div
        className="flex shrink-0 items-center justify-between px-7 pb-6"
        style={{ paddingTop: 'calc(var(--app-safe-top) + 16px)' }}
      >
        <span className="font-body text-[18px] font-bold text-text-primary">
          {profile.nickname}
        </span>
        <Link
          to="/edit-profile"
          className="font-mono text-[15px] font-bold text-text-focus outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-focus"
        >
          {t('common.edit')}
        </Link>
      </div>

      {/* Прокручуваний контент */}
      <div className="scrollbar-hide flex-1 overflow-y-auto px-7 pb-6">
        <div className="flex flex-col gap-8">
          {/* Статистика гравця */}
          <ProfileStats
            rewards={profile.rewards}
            gamesCount={profile.gamesCount}
            winCount={profile.winCount}
            ticketsCount={profile.ticketsCount}
          />

          {/* Розділювач */}
          <div className="h-px w-full bg-border-dashed" />

          {/* Список останніх ігор */}
          <GameHistoryList games={profile.games} />
        </div>
      </div>

      {/* Фіксований футер: патерн гравця + кнопка «Go back» */}
      <div className="shrink-0">
        <PlayerPatternPanel pattern={profile.pattern} onGoBack={handleGoBack} />
      </div>
    </div>
  )
}

export default ProfilePage
