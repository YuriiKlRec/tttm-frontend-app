import type { FC } from 'react'
import { NavItem } from './NavItem'
import { NAV_TABS } from '../../constants/tabs'
import { useNavBadges } from '../../hooks/useNavBadges'
import { useT } from '../../i18n/useT'
import type { TabKey } from '../../types/navigation'

/** Нижня навігація: 4 вкладки з живими лічильниками ігор у фазі. */
export const BottomNav: FC = () => {
  const badges = useNavBadges()
  const { t } = useT()
  // Динамічний бейдж за ключем вкладки; results — без лічильника.
  const badgeFor = (key: TabKey): number | null => {
    if (key === 'predictions') return badges.predictions
    if (key === 'waiting') return badges.waiting
    return null
  }

  return (
    <nav
      aria-label={t('nav.ariaLabel')}
      className="relative z-10 flex items-center justify-between border-t border-border-solid bg-surface px-5 pb-[var(--app-safe-bottom)]"
    >
      {NAV_TABS.map((tab) => (
        <NavItem key={tab.key} tab={tab} badge={badgeFor(tab.key)} />
      ))}
    </nav>
  )
}
