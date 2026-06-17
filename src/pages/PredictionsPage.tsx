import type { FC } from 'react'
import { Hero } from '../components/ui/Hero'
import { EmptyState } from '../components/ui/EmptyState'
import { GameCard } from '../components/games/GameCard'
import { mockGames } from '../mocks/games'

/** Вкладка Predictions: hero + список ігор (або порожній стан). */
const PredictionsPage: FC = () => (
  <>
    <Hero />
    <div className="w-full">
      {mockGames.length > 0 ? (
        <div className="space-y-8">
          {mockGames.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  </>
)

export default PredictionsPage
