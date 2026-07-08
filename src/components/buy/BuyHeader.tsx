import type { FC } from 'react'
import { WalletButton } from '../wallet/WalletButton'
import { useT } from '../../i18n/useT'

/**
 * Фіксована шапка сторінки оплати: зліва заголовок «Buy tickets» (Geist Bold),
 * справа — кнопка гаманця TonConnect. Враховує safe-area.
 */
export const BuyHeader: FC = () => {
  const { t } = useT()

  return (
    <header
      className="relative z-20 flex items-center justify-between bg-background px-7 pb-3"
      style={{ paddingTop: 'calc(var(--app-safe-top) + 12px)' }}
    >
      <h1 className="font-body text-[18px] font-bold text-text-primary">{t('buy.title')}</h1>
      <WalletButton />
    </header>
  )
}
