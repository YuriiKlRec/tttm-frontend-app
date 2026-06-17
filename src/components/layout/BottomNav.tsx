import type { FC } from 'react'
import { NavItem } from './NavItem'
import { NAV_TABS } from '../../constants/tabs'

/** Нижня навігація: 3 вкладки. Фіксована, з safe-area знизу. */
export const BottomNav: FC = () => (
  <nav
    aria-label="Main navigation"
    className="relative z-10 flex items-center justify-between border-t border-border-solid bg-surface px-7 pb-[var(--app-safe-bottom)]"
  >
    {NAV_TABS.map((tab) => (
      <NavItem key={tab.key} tab={tab} />
    ))}
  </nav>
)
