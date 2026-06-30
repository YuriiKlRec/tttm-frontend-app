import type { FC } from 'react'
import { WalletButton } from '../wallet/WalletButton'
import { useT } from '../../i18n/useT'

/** Пропси шапки сторінки оплати. */
interface BuyHeaderProps {
  /** Підпис відліку (моковий, напр. "00:03:01"). */
  countdown: string
}

/**
 * Фіксована шапка сторінки оплати: зліва заголовок «Buy tickets» (Geist Bold)
 * та моковий відлік (font-mono), справа — кнопка гаманця TonConnect.
 * Враховує safe-area.
 */
export const BuyHeader: FC<BuyHeaderProps> = ({ countdown }) => {
  const { t } = useT()

  return (
    <header
      className="relative z-20 flex items-center justify-between bg-background px-7 pb-3"
      style={{ paddingTop: 'calc(var(--app-safe-top) + 12px)' }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-body text-[18px] font-bold text-text-primary">{t('buy.title')}</h1>
        <span className="font-mono text-[16px] font-bold text-text-primary">{countdown}</span>
      </div>
      <WalletButton />
    </header>
  )
}
