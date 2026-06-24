import type { FC } from 'react'
import { Navigate } from 'react-router-dom'
import { PredictionButton } from '../components/ui/PredictionButton'
import { useBinancePrice } from '../hooks/useBinancePrice'
import { useAuth } from '../hooks/useAuth'
import { centsToUsd } from '../utils/units'
import rocketAir from '../assets/rocket-air.png'
import iconBitcoin from '../assets/icon-bitcoin.svg'

/**
 * Перший екран онбордингу `/welcome`: фон-ракета, поточна ціна BTC зверху,
 * привітання по центру та CTA «Get started» унизу.
 * Якщо користувач вже прийняв умови — одразу редирект на головну.
 */
const WelcomePage: FC = () => {
  const { user } = useAuth()

  // Якщо умови вже прийнято — не показуємо онбординг
  if (user?.termsAccepted) {
    return <Navigate to="/" replace />
  }

  // Жива ціна BTC з Binance WebSocket; null — до першого тіку
  const livePrice = useBinancePrice()
  // Форматуємо аналогічно до GamePage (centsToUsd(Math.round(price*100)))
  const priceStr = livePrice !== null ? centsToUsd(Math.round(livePrice * 100)) : '—'

  return (
  <div className="relative mx-auto h-[100dvh] max-w-[430px] overflow-hidden bg-background">
    {/* Фон-ракета: центрований по вертикалі, масштабований як у Figma. */}
    <div
      className="pointer-events-none absolute left-0 top-[calc(50%+12px)] aspect-[390/920] w-full -translate-y-1/2 overflow-hidden"
      aria-hidden="true"
    >
      <img
        src={rocketAir}
        alt=""
        className="absolute left-[-105.01%] top-[-2.28%] h-[116.85%] w-[413.35%] max-w-none"
      />
    </div>

    {/* Верх: поточна ціна BTC з Binance WebSocket. */}
    <div className="absolute inset-x-7 top-[calc(var(--app-safe-top)+32px)] z-10 flex flex-col items-center gap-2 text-center">
      <span className="font-mono text-[13px] font-bold text-text-primary">BTC/USDT:</span>
      <span className="font-mono text-[22px] font-bold text-text-primary">{priceStr}</span>
    </div>

    {/* Центр: привітання гравця. */}
    <div className="absolute left-1/2 top-1/2 z-10 flex w-[334px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-5 text-center">
      <img src={iconBitcoin} alt="" aria-hidden="true" className="h-8 w-8" />
      <h1 className="font-display text-[32px] text-text-primary">Welcome, Player!</h1>
      <p className="font-body text-[18px] font-bold text-text-primary">
        Compete to predict Bitcoin&apos;s price and earn rewards
      </p>
    </div>

    {/* Низ: CTA на екран угоди. */}
    <div className="absolute inset-x-8 bottom-[calc(var(--app-safe-bottom)+32px)] z-10">
      <PredictionButton label="Get started" to="/terms" />
    </div>
  </div>
  )
}

export default WelcomePage
