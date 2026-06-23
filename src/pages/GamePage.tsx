import { useMemo, useState, type FC } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { GameLayout } from '../components/layout/GameLayout'
import { GameHeader } from '../components/games/GameHeader'
import { BetPanel } from '../components/games/BetPanel'
import { GameContent } from '../components/games/GameContent'
import { CartPanel } from '../components/games/cart/CartPanel'
import { ClosestPredictions } from '../components/games/ClosestPredictions'
import { useChartData } from '../hooks/useChartData'
import { useNow } from '../hooks/useNow'
import { useBookedCart } from '../context/BookedCartProvider'
import type { Timeframe } from '../services/binance'
import {
  mockBets,
  mockChartBets,
  mockClosest,
  mockCurrencyPrice,
  mockFinalPrice,
  mockGameDetail,
  mockGameInfo,
  mockPredictionStats,
  mockResultInfo,
} from '../mocks/gameDetail'
import type { ViewMode } from '../types/game'

/** Торгова пара для графіка (поки фіксована). */
const SYMBOL = 'BTCUSDT'

/** Фаза гри: прийом ставок / очікування фіналізації / завершено. */
type GamePhase = 'active' | 'waiting' | 'finished'

/**
 * Окрема сторінка гри `/game/:id` (поза AppLayout): шапка з відліком і перемикачем
 * виду, інтерактивний графік ціни BTC у центрі та підвал ставки.
 * Дані гри — з моку, дані графіка — з Binance (REST + WebSocket).
 */
const GamePage: FC = () => {
  useParams<{ id: string }>()
  const game = mockGameDetail
  const [searchParams] = useSearchParams()
  // Початковий вид: ?view=predictions відкриває список ставок (з «All tickets»).
  const initialView: ViewMode = searchParams.get('view') === 'predictions' ? 'bets' : 'chart'
  const [rawViewMode, setViewMode] = useState<ViewMode>(initialView)
  const [timeframe, setTimeframe] = useState<Timeframe>('1m')
  // Фільтр «лише мої ставки» — керується кнопкою в шапці (вид Predictions).
  const [mineOnly, setMineOnly] = useState(false)

  // Фаза гри: active (прийом ставок) → waiting (закрито, чекає фіналізації) →
  // finished (завершено). DEV-перемикач циклічно форсує фазу для демо.
  const now = useNow()
  const [phaseOverride, setPhaseOverride] = useState<GamePhase | null>(null)
  const computedPhase: GamePhase =
    now < mockGameDetail.betCloseTime ? 'active' : now < mockGameDetail.endTime ? 'waiting' : 'finished'
  const phase = phaseOverride ?? computedPhase
  const cyclePhase = (): void =>
    setPhaseOverride((p) => {
      const order: (GamePhase | null)[] = ['active', 'waiting', 'finished', null]
      const current = p ?? computedPhase
      return order[(order.indexOf(current) + 1) % order.length]
    })

  // У завершеній грі вид «графік» недоступний: дропдаун без нього, а пряме
  // посилання на chart перенаправляємо на список ставок.
  const finished = phase === 'finished'
  const viewMode: ViewMode = finished && rawViewMode === 'chart' ? 'bets' : rawViewMode
  const viewOptions: ViewMode[] | undefined = finished ? ['bets', 'details'] : undefined
  // Деталі завершеної гри додають групу результату (переможець/курс/квиток).
  const gameInfo = finished ? [mockResultInfo, ...mockGameInfo] : mockGameInfo
  // Єдине джерело правди для вибраної ціни: і графік, і поле читають/пишуть сюди.
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>(undefined)
  // Корзина заброньованих ставок + чи відкрита панель Booked (замість графіка).
  const cart = useBookedCart()
  const [cartOpen, setCartOpen] = useState(false)

  const { candles, currentPrice } = useChartData(SYMBOL, timeframe)

  // Маркери графіка: мокові (оплачені свої/чужі) + заброньовані з корзини
  // (свої неоплачені — малюються на білому фоні).
  const chartBets = useMemo(
    () => [
      ...mockChartBets,
      ...cart.prices.map((price) => ({ price, mine: true, booked: true })),
    ],
    [cart.prices],
  )

  // Стабільний геймовий контекст для графіка — інакше новий об'єкт щорендеру
  // змушував би canvas перемальовуватись зайвий раз.
  const chartGame = useMemo(
    () => ({
      startTime: game.startTime,
      betOpenTime: game.betOpenTime,
      betCloseTime: game.betCloseTime,
      endTime: game.endTime,
    }),
    [game.startTime, game.betOpenTime, game.betCloseTime, game.endTime],
  )

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
          viewOptions={viewOptions}
          finished={finished}
          finalPrice={mockFinalPrice}
        />
      }
      footer={
        phase === 'active' ? (
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
        ) : phase === 'waiting' ? (
          <ClosestPredictions
            leader={mockClosest.leader}
            mine={mockClosest.mine}
            deviationPercent={mockClosest.deviationPercent}
            viewMode={viewMode}
            onChangeView={setViewMode}
          />
        ) : undefined
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
        info={gameInfo}
        price={mockCurrencyPrice}
        showCurrencyPlate={!finished}
        candles={candles}
        currentPrice={currentPrice}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        game={chartGame}
        chartBets={chartBets}
        winningPool={mockPredictionStats.reward}
        onPriceSelect={setSelectedPrice}
        externalPrice={selectedPrice}
        interactive={phase === 'active'}
      />
      )}

      {/* DEV-перемикач фази гри — приберемо після демонстрації. */}
      <button
        type="button"
        onClick={cyclePhase}
        className="absolute right-2 top-1/2 z-50 bg-black/50 px-2 py-1 font-mono text-[10px] text-text-secondary"
      >
        DEV phase: {phase}
      </button>
    </GameLayout>
  )
}

export default GamePage
