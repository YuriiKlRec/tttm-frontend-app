import type { FC } from 'react'
import { NavLink } from 'react-router-dom'
import type { NavTab } from '../../types/navigation'
import { useT } from '../../i18n/useT'

interface NavItemProps {
  tab: NavTab
  /** Динамічне значення бейджа; перевизначає `tab.badge`. null — без бейджа. */
  badge?: number | null
}

/** Бейдж лічильника над іконкою. Активний — помаранчевий, неактивний — білий. */
const Badge: FC<{ value: number; active: boolean }> = ({ value, active }) => (
  <span
    className={`absolute -right-2 -top-1 min-w-[14px] rounded-md px-1 text-center text-[10px] font-bold text-[#0b0b0b] ${
      active ? 'bg-btc' : 'bg-white'
    }`}
  >
    {value}
  </span>
)

/** Пункт нижньої навігації: іконка + підпис + опційний бейдж. */
export const NavItem: FC<NavItemProps> = ({ tab, badge }) => {
  const { path, Icon } = tab
  const { t } = useT()
  // Динамічне значення (з пропа) має пріоритет над статичним tab.badge.
  const value = badge !== undefined ? badge : tab.badge

  return (
    <NavLink
      to={path}
      end={path === '/'}
      className="flex flex-1 flex-col items-center gap-1.5 py-4"
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon
              className={`h-6 w-6 ${isActive ? 'text-text-focus' : 'text-text-primary'}`}
              aria-hidden="true"
            />
            {value !== null && value > 0 && <Badge value={value} active={isActive} />}
          </span>
          <span
            className={`font-mono text-[13px] font-bold ${
              isActive ? 'text-text-focus' : 'text-text-primary'
            }`}
          >
            {t(`nav.${tab.key}`)}
          </span>
        </>
      )}
    </NavLink>
  )
}
