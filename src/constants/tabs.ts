import { PredictionsIcon } from '../components/icons/PredictionsIcon'
import { WaitingIcon } from '../components/icons/WaitingIcon'
import { ResultsIcon } from '../components/icons/ResultsIcon'
import type { NavTab } from '../types/navigation'

/** Конфігурація вкладок нижньої навігації. Порядок = індекс для напрямку slide. */
export const NAV_TABS: readonly NavTab[] = [
  { key: 'predictions', path: '/', label: 'Predictions', Icon: PredictionsIcon, badge: 0 },
  { key: 'waiting', path: '/waiting', label: 'Waiting', Icon: WaitingIcon, badge: 0 },
  { key: 'results', path: '/results', label: 'Results', Icon: ResultsIcon, badge: null },
]

/** Індекс вкладки за поточним шляхом (для напрямку переходу) */
export const getTabIndexByPath = (pathname: string): number => {
  const index = NAV_TABS.findIndex((tab) => tab.path === pathname)
  return index === -1 ? 0 : index
}
