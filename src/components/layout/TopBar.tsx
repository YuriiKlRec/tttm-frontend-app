import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { WalletButton } from '../wallet/WalletButton'
import { IconButton } from '../ui/IconButton'
import plusIcon from '../../assets/icon-plus.svg'

/** Верхня панель: ім'я користувача + кнопка гаманця + створення гри. Фіксована, з safe-area зверху. */
export const TopBar: FC = () => (
  <header className="flex items-center justify-between border-b border-border-solid bg-background px-5 py-4 pt-[calc(var(--app-safe-top)+1rem)]">
    <Link
      to="/profile"
      className="text-[15px] font-bold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      @ User_name
    </Link>
    <div className="flex items-center gap-3">
      <WalletButton />
      {/* створення гри — доступно авторам (маршрут /create-game поки заглушка) */}
      <IconButton as="link" to="/create-game" icon={plusIcon} label="Create game" />
    </div>
  </header>
)
