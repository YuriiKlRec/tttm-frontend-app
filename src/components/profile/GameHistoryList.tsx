import type { FC } from 'react'
import type { ProfileGame } from '../../types/profile'
import { GameHistoryItem } from './GameHistoryItem'
import { useT } from '../../i18n/useT'
import ticketIcon from '../../assets/icon-ticket.svg'

/** Пропси списку останніх ігор профілю. */
interface GameHistoryListProps {
  games: ProfileGame[]
}

/**
 * Список останніх 10 ігор гравця з заголовком.
 *
 * Порожній стан: іконка + текст-плейсхолдер.
 * Непорожній: список карток через `<GameHistoryItem>`, розділених відступом 2px.
 */
export const GameHistoryList: FC<GameHistoryListProps> = ({ games }) => {
  const { t } = useT()

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-body text-[15px] font-bold text-text-primary">{t('profile.lastGames')}</h2>

      {games.length === 0 ? (
        /* Плейсхолдер — ще немає ігор */
        <div className="flex flex-col items-center justify-center gap-2 bg-surface py-10">
          <img src={ticketIcon} alt="" aria-hidden="true" className="h-6 w-6" />
          <p className="font-body text-[15px] text-text-secondary text-center">
            {t('profile.gamesEmpty')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[2px]">
          {games.map((game) => (
            <GameHistoryItem key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  )
}
