import type { FC } from 'react'
import { Hero } from '../components/ui/Hero'
import { EmptyState } from '../components/ui/EmptyState'

/** Вкладка Waiting: hero + порожній стан списку ігор. */
const WaitingPage: FC = () => (
  <>
    <Hero />
    <div className="w-full">
      <EmptyState />
    </div>
  </>
)

export default WaitingPage
