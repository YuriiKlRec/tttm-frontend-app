import type { FC } from 'react'
import btcIcon from '../../assets/icon-btc.svg'

/** Пропси плашки курсу валютної пари. */
interface CurrencyPricePlateProps {
  /** Поточна ціна (напр. "$62,542.47"). */
  price: string
}

/**
 * Плашка курсу BTC/USDT. Зліва — іконка BTC і назва пари, справа — поточна
 * ціна (оранжева). Фон плашки = фон сторінки (bg-background) з оранжевою штриховою
 * рамкою — єдиний стиль плашки за макетом (сторінка гри й вкладка Waiting використовують той самий вигляд).
 * relative — фон малюється поверх PixelGrid (інакше крізь плашку видно сітку, див. коміт 404214d).
 */
export const CurrencyPricePlate: FC<CurrencyPricePlateProps> = ({ price }) => (
  <div className="relative flex items-center justify-between border border-dashed border-[rgba(255,153,0,0.25)] bg-background px-4 py-1.5">
    <span className="flex items-center gap-2">
      <img src={btcIcon} alt="" aria-hidden="true" className="h-6 w-6" />
      <span className="font-mono text-[15px] font-bold text-text-primary">BTC/USDT</span>
    </span>
    <span className="font-mono text-[15px] font-bold text-text-focus">{price}</span>
  </div>
)
