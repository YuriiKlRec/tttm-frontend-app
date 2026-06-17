import type { FC } from 'react'
import { NavLink } from 'react-router-dom'
import type { NavTab } from '../../types/navigation'

interface NavItemProps {
  tab: NavTab
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
export const NavItem: FC<NavItemProps> = ({ tab }) => {
  const { path, label, Icon, badge } = tab

  return (
    <NavLink
      to={path}
      end={path === '/'}
      className="flex w-[108px] flex-col items-center gap-1.5 py-4"
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon
              className={`h-6 w-6 ${isActive ? 'text-text-focus' : 'text-text-primary'}`}
              aria-hidden="true"
            />
            {badge !== null && <Badge value={badge} active={isActive} />}
          </span>
          <span
            className={`font-mono text-[13px] font-bold ${
              isActive ? 'text-text-focus' : 'text-text-primary'
            }`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}
