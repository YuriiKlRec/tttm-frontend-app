import type { FC } from 'react'
import { WalletButton } from '../wallet/WalletButton'
import { useAuth } from '../../hooks/useAuth'

/**
 * Фіксована шапка сторінки створення гри: зліва ім'я користувача,
 * справа — кнопка гаманця TonConnect. Без кнопки «+» та нижньої навігації.
 * Враховує safe-area зверху.
 */
export const CreateGameHeader: FC = () => {
  const { user } = useAuth()

  return (
    <header
      className="relative z-20 flex items-center justify-between border-b border-border-solid bg-background px-5 py-4"
      style={{ paddingTop: 'calc(var(--app-safe-top) + 1rem)' }}
    >
      <span className="text-[15px] font-bold text-text-primary">
        @{user?.nickname ?? '…'}
      </span>
      <WalletButton />
    </header>
  )
}
