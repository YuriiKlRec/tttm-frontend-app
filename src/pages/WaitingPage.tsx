import type { FC } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { CurrencyPricePlate } from '../components/games/CurrencyPricePlate'
import { WaitCard } from '../components/games/WaitCard'
import { mockWaitGames } from '../mocks/waitGames'

/** Поточний курс пари для плашки (мок). */
const MOCK_PRICE = '$56,542.47'

/**
 * Вкладка Waiting: плашка поточного курсу + список ігор, що очікують
 * фіналізації (або порожній стан). Без hero-заголовка (на відміну від Predictions).
 */
const WaitingPage: FC = () => (
  <>
    <div className="sticky top-0 z-20 -mt-8 w-full bg-background px-3 pt-1.5 pb-3">
      <CurrencyPricePlate price={MOCK_PRICE} />
    </div>
    <div className="w-full">
      {mockWaitGames.length > 0 ? (
        <div className="space-y-8">
          {mockWaitGames.map((game) => (
            <WaitCard key={game.id} {...game} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  </>
)

export default WaitingPage
