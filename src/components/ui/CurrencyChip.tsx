import type { FC } from 'react'
import btcIcon from '../../assets/icon-btc.svg'

/** Чип валютної пари: іконка BTC + "BTC/USDT". */
export const CurrencyChip: FC = () => (
  <div className="flex items-center gap-2">
    <img src={btcIcon} alt="" aria-hidden="true" className="h-6 w-6" />
    <span className="font-mono text-base font-bold text-text-primary">BTC/USDT</span>
  </div>
)
