import { useState, type FC } from 'react'
import { useParams } from 'react-router-dom'
import { GameLayout } from '../components/layout/GameLayout'
import { GameHeader } from '../components/games/GameHeader'
import { BetPanel } from '../components/games/BetPanel'
import { GameContent } from '../components/games/GameContent'
import { useChartData } from '../hooks/useChartData'
import type { Timeframe } from '../services/binance'
import {
  mockBets,
  mockChartBets,
  mockCurrencyPrice,
  mockGameDetail,
  mockGameInfo,
  mockPredictionStats,
} from '../mocks/gameDetail'
import type { ViewMode } from '../types/game'

/** Торгова пара для графіка (поки фіксована). */
const SYMBOL = 'BTCUSDT'

/**
 * Окрема сторінка гри `/game/:id` (поза AppLayout): шапка з відліком і перемикачем
 * виду, інтерактивний графік ціни BTC у центрі та підвал ставки.
 * Дані гри — з моку, дані графіка — з Binance (REST + WebSocket).
 */
const GamePage: FC = () => {
  useParams<{ id: string }>()
  const game = mockGameDetail
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [timeframe, setTimeframe] = useState<Timeframe>('1m')
  // Єдине джерело правди для вибраної ціни: і графік, і поле читають/пишуть сюди.
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>(undefined)

  const { candles, currentPrice } = useChartData(SYMBOL, timeframe)

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
          presetPrice={selectedPrice}
          onPriceChange={setSelectedPrice}
        />
      }
    >
      <GameContent
        viewMode={viewMode}
        bets={mockBets}
        stats={mockPredictionStats}
        info={mockGameInfo}
        price={mockCurrencyPrice}
        candles={candles}
        currentPrice={currentPrice}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        game={{
          startTime: game.startTime,
          betOpenTime: game.betOpenTime,
          betCloseTime: game.betCloseTime,
          endTime: game.endTime,
        }}
        chartBets={mockChartBets}
        winningPool={mockPredictionStats.reward}
        onPriceSelect={setSelectedPrice}
        externalPrice={selectedPrice}
      />
    </GameLayout>
  )
}

export default GamePage
