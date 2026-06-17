import type { FC } from 'react'
import btcIcon from '../../assets/icon-btc.svg'

/** Пропси плашки курсу валютної пари. */
interface CurrencyPricePlateProps {
  /** Поточна ціна (напр. "$62,542.47"). */
  price: string
}

/**
 * Плашка курсу BTC/USDT: темний фон зі штриховою оранжевою рамкою.
 * Зліва — іконка BTC і назва пари, справа — поточна ціна (оранжева).
 * Прикріплюється внизу центральної області поверх списку (absolute задає батько).
 */
export const CurrencyPricePlate: FC<CurrencyPricePlateProps> = ({ price }) => (
  <div className="flex items-center justify-between border border-dashed border-[rgba(255,153,0,0.25)] bg-[#212121] px-4 py-1.5">
    <span className="flex items-center gap-2">
      <img src={btcIcon} alt="" aria-hidden="true" className="h-6 w-6" />
      <span className="font-mono text-[15px] font-bold text-text-primary">BTC/USDT</span>
    </span>
    <span className="font-mono text-[15px] font-bold text-text-focus">{price}</span>
  </div>
)
