import type { FC } from 'react'
import type { Bet, DetailGroup, ViewMode } from '../../types/game'
import type { Candle, Timeframe } from '../../services/binance'
import type { ChartBet, ChartGame } from './chart/chartTypes'
import { PredictionsView } from './PredictionsView'
import { DetailsView } from './DetailsView'
import { PriceChart } from './chart/PriceChart'

/** Статистика гри для вигляду «Predictions». */
interface PredictionsStats {
  /** Призовий фонд. */
  reward: string
  /** Усі зайняті квитки. */
  ticketsTaken: string
  /** Квитки користувача. */
  ticketsMine: string
  /** Кількість гравців. */
  players: string
}

/** Пропси центральної області сторінки гри. */
interface GameContentProps {
  /** Поточний вид. */
  viewMode: ViewMode
  /** Фільтр «лише мої ставки» для вигляду «Predictions». */
  mineOnly: boolean
  /** Ставки для вигляду «Predictions». */
  bets: Bet[]
  /** Статистика для вигляду «Predictions». */
  stats: PredictionsStats
  /** Групи інформації для вигляду «Details». */
  info: DetailGroup[]
  /** Поточна ціна для плашки курсу. */
  price: string
  /** Свічки історії для графіка. */
  candles: Candle[]
  /** Жива ціна BTC або null. */
  currentPrice: number | null
  /** Поточний таймфрейм графіка. */
  timeframe: Timeframe
  /** Зміна таймфрейму (горизонтальний свайп). */
  onTimeframeChange: (tf: Timeframe) => void
  /** Геймовий контекст для колонок графіка. */
  game: ChartGame
  /** Ставки для маркерів графіка. */
  chartBets: ChartBet[]
  /** Виграшний пул (напр. "2.4 TON"). */
  winningPool: string
  /** Вибір ціни Y-контролером графіка. */
  onPriceSelect: (price: number) => void
  /** Зовнішня ціна (з поля ставки) — рухає Y-контролер графіка. */
  externalPrice?: number
  /** Інтерактивний графік: false для завершеної гри. */
  interactive?: boolean
  /** Показувати плашку курсу у Predictions (приховано для завершеної гри). */
  showCurrencyPlate?: boolean
}

/**
 * Перемикач центральної області сторінки гри за `viewMode`:
 * chart → інтерактивний графік, bets → Predictions, details → Details.
 */
export const GameContent: FC<GameContentProps> = ({
  viewMode,
  mineOnly,
  bets,
  stats,
  info,
  price,
  candles,
  currentPrice,
  timeframe,
  onTimeframeChange,
  game,
  chartBets,
  winningPool,
  onPriceSelect,
  externalPrice,
  interactive = true,
  showCurrencyPlate = true,
}) => {
  if (viewMode === 'bets') {
    return (
      <PredictionsView
        bets={bets}
        stats={stats}
        price={price}
        mineOnly={mineOnly}
        showPrice={showCurrencyPlate}
      />
    )
  }

  if (viewMode === 'details') {
    return <DetailsView groups={info} price={price} showPrice={showCurrencyPlate} />
  }

  return (
    <PriceChart
      candles={candles}
      currentPrice={currentPrice}
      timeframe={timeframe}
      onTimeframeChange={onTimeframeChange}
      game={game}
      bets={chartBets}
      winningPool={winningPool}
      onPriceSelect={onPriceSelect}
      externalPrice={externalPrice}
      interactive={interactive}
    />
  )
}
