import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { WalletButton } from '../wallet/WalletButton'
import { IconButton } from '../ui/IconButton'
import { useT } from '../../i18n/useT'
import plusIcon from '../../assets/icon-plus.svg'
import helmetIcon from '../../assets/icon-helmet.png'
import { useAuth } from '../../hooks/useAuth'

/** Верхня панель: іконка + ім'я користувача + кнопка гаманця + створення гри. Фіксована, з safe-area зверху. */
export const TopBar: FC = () => {
  const { user } = useAuth()
  const { t } = useT()

  return (
    // relative — фон #212121 малюється поверх PixelGrid (інакше крізь шапку видно сітку)
    <header className="relative flex items-center justify-between border-b border-border-solid bg-background px-5 py-4 pt-[calc(var(--app-safe-top)+1rem)]">
      <Link
        to="/profile"
        className="flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <img src={helmetIcon} alt="" aria-hidden="true" className="h-8 w-8" />
        {/* Показуємо нікнейм після ініціалізації; до готовності — нейтральний плейсхолдер */}
        <span className="text-[14px] font-semibold text-text-focus">
          @{user ? user.nickname : '…'}
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <WalletButton />
        {/* створення гри — доступно авторам (маршрут /create-game поки заглушка) */}
        <IconButton
          as="link"
          to="/create-game"
          icon={plusIcon}
          label={t('layout.createGameAria')}
          iconSize="sm"
        />
      </div>
    </header>
  )
}
