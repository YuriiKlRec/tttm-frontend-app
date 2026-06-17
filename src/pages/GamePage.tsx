import { useState, type FC } from 'react'
import { useParams } from 'react-router-dom'
import { GameLayout } from '../components/layout/GameLayout'
import { GameHeader } from '../components/games/GameHeader'
import { BetPanel } from '../components/games/BetPanel'
import { GameContent } from '../components/games/GameContent'
import {
  mockBets,
  mockCurrencyPrice,
  mockGameDetail,
  mockGameInfo,
  mockPredictionStats,
} from '../mocks/gameDetail'
import type { ViewMode } from '../types/game'

/**
 * Окрема сторінка гри `/game/:id` (поза AppLayout): шапка з відліком і перемикачем
 * виду, порожня центральна область та інтерактивний підвал ставки.
 * Дані поки беруться з моку (id ігнорується).
 */
const GamePage: FC = () => {
  useParams<{ id: string }>()
  const game = mockGameDetail
  const [viewMode, setViewMode] = useState<ViewMode>('chart')

  return (
    <GameLayout
      header={
        <GameHeader
          name={game.name}
          endTime={game.endTime}
          viewMode={viewMode}
          onViewChange={setViewMode}
        />
      }
      footer={
        <BetPanel
          ticketPrice={game.ticketPrice}
          betCloseTime={game.betCloseTime}
          takenByOthers={game.takenByOthers}
          yourTickets={game.yourTickets}
        />
      }
    >
      <GameContent
        viewMode={viewMode}
        bets={mockBets}
        stats={mockPredictionStats}
        info={mockGameInfo}
        price={mockCurrencyPrice}
      />
    </GameLayout>
  )
}

export default GamePage
