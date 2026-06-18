import { useState, type FC } from 'react'
import { useParams } from 'react-router-dom'
import { GameLayout } from '../components/layout/GameLayout'
import { GameHeader } from '../components/games/GameHeader'
import { BetPanel } from '../components/games/BetPanel'
import { GameContent } from '../components/games/GameContent'
import { CartPanel } from '../components/games/cart/CartPanel'
import { useChartData } from '../hooks/useChartData'
import { useBookedCart } from '../hooks/useBookedCart'
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
  // Фільтр «лише мої ставки» — керується кнопкою в шапці (вид Predictions).
  const [mineOnly, setMineOnly] = useState(false)
  // Єдине джерело правди для вибраної ціни: і графік, і поле читають/пишуть сюди.
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>(undefined)
  // Корзина заброньованих ставок + чи відкрита панель Booked (замість графіка).
  const cart = useBookedCart()
  const [cartOpen, setCartOpen] = useState(false)

  const { candles, currentPrice } = useChartData(SYMBOL, timeframe)

  // «Edit»: повертає ціну в поле вводу та прибирає її з корзини (панель лишається).
  const handleEditBooked = (price: number): void => {
    cart.remove(price)
    setSelectedPrice(price)
  }

  // «Clear all»: очищає корзину та згортає панель на графік.
  const handleClearAll = (): void => {
    cart.clear()
    setCartOpen(false)
  }

  return (
    <GameLayout
      header={
        <GameHeader
          name={game.name}
          endTime={game.endTime}
          viewMode={viewMode}
          onViewChange={setViewMode}
          mineOnly={mineOnly}
          onToggleMine={() => setMineOnly((prev) => !prev)}
        />
      }
      footer={
        <BetPanel
          ticketPrice={game.ticketPrice}
          betCloseTime={game.betCloseTime}
          takenByOthers={game.takenByOthers}
          yourTickets={game.yourTickets}
          cart={cart}
          onOpenCart={() => setCartOpen(true)}
          presetPrice={selectedPrice}
          onPriceChange={setSelectedPrice}
        />
      }
    >
      {cartOpen ? (
        <CartPanel
          prices={cart.prices}
          ticketPrice={game.ticketPrice}
          onClose={() => setCartOpen(false)}
          onClearAll={handleClearAll}
          onEdit={handleEditBooked}
          onRemove={cart.remove}
        />
      ) : (
        <GameContent
        viewMode={viewMode}
        mineOnly={mineOnly}
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
      )}
    </GameLayout>
  )
}

export default GamePage
