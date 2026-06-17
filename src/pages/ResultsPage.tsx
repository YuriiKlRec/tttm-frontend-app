import type { FC } from 'react'
import { Hero } from '../components/ui/Hero'
import { EmptyState } from '../components/ui/EmptyState'

/** Вкладка Results: hero + порожній стан списку ігор. */
const ResultsPage: FC = () => (
  <>
    <Hero />
    <div className="w-full">
      <EmptyState />
    </div>
  </>
)

export default ResultsPage
