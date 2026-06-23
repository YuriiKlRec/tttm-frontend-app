import { useEffect, useState, type FC } from 'react'
import { PriceInput } from './PriceInput'
import { BetActionButton } from './BetActionButton'
import { BetHint } from './BetHint'
import { PredictionButton } from '../ui/PredictionButton'
import { useBetPanel } from '../../hooks/useBetPanel'
import { useNow } from '../../hooks/useNow'
import { formatCountdown } from '../../utils/time'
import { totalTon } from '../../utils/price'
import type { BookedCart } from '../../context/BookedCartProvider'
import ticketIcon from '../../assets/icon-ticket.svg'
import btcIcon from '../../assets/icon-btc.svg'
import linkIcon from '../../assets/icon-link-orange.svg'

/** Пропси підвалу з формою ставки. */
interface BetPanelProps {
  /** Ціна одного квитка в TON (напр. "0.1"). */
  ticketPrice: string
  /** Час закриття прийому ставок (epoch ms) — для зворотного відліку. */
  betCloseTime: number
  /** Ціни, зайняті іншими гравцями. */
  takenByOthers: number[]
  /** Ціни квитків поточного користувача. */
  yourTickets: number[]
  /** Корзина заброньованих цін (спільний стан зі сторінкою). */
  cart: BookedCart
  /** Відкрити панель Booked (доступно лише за наявності ставок). */
  onOpenCart: () => void
  /** Попередньо вибрана ціна (з Y-контролера графіка) — заповнює поле. */
  presetPrice?: number
  /** Емітується при діях користувача над полем (синк → контролер графіка). */
  onPriceChange?: (price: number) => void
}

/** Варіант action-кнопки за статусом ціни. */
const actionVariant = (
  status: ReturnType<typeof useBetPanel>['status'],
): 'book' | 'remove' | 'disabled' => {
  if (status === 'bookable') {
    return 'book'
  }
  if (status === 'booked-active') {
    return 'remove'
  }
  return 'disabled'
}

/**
 * Інтерактивний підвал ставки: введення ціни прогнозу зі степерами,
 * накопичення заброньованих цін та CTA "Buy tickets" із живим відліком
 * до закриття ставок. Враховує safe-area знизу.
 */
export const BetPanel: FC<BetPanelProps> = ({
  ticketPrice,
  betCloseTime,
  takenByOthers,
  yourTickets,
  cart,
  onOpenCart,
  presetPrice,
  onPriceChange,
}) => {
  const { input, status, setInput, decrement, increment, toggleBooking, applyExternal } =
    useBetPanel({ takenByOthers, yourTickets, cart, onPriceChange })
  const now = useNow()

  // Y-контролер графіка заповнює поле ціни (силент: applyExternal НЕ емітить
  // onPriceChange, тому синк графік→поле не повертається назад у контролер).
  useEffect(() => {
    if (presetPrice !== undefined && Number.isFinite(presetPrice) && presetPrice > 0) {
      applyExternal(presetPrice)
    }
    // applyExternal стабільний у межах рендера; реагуємо лише на presetPrice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetPrice])

  const bookedCount = cart.prices.length
  const countdown = formatCountdown(betCloseTime - now)
  const [copied, setCopied] = useState(false)

  // Копіює посилання на гру в буфер обміну з коротким підтвердженням.
  const handleCopyLink = (): void => {
    void navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <footer
      className="relative z-20 flex w-full flex-col gap-4 border-t border-border-dashed bg-surface py-4"
      style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 16px)' }}
    >
      <div className="flex flex-col gap-4 px-7">
        {bookedCount === 0 ? (
          <p className="flex items-center justify-center gap-2">
            <img src={ticketIcon} alt="" aria-hidden="true" className="w-6" />
            <span className="font-mono text-[15px] text-text-primary">= {ticketPrice} TON</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={onOpenCart}
            className="flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <img src={ticketIcon} alt="" aria-hidden="true" className="w-6" />
            <span className="font-mono text-[15px] text-text-focus">
              Booked: {bookedCount} | {totalTon(bookedCount, ticketPrice)}
            </span>
          </button>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 pr-2">
            <span className="shrink-0">
              <img src={btcIcon} alt="" aria-hidden="true" className="h-8 w-8" />
            </span>
            <div className="flex flex-1 items-center gap-5">
              <PriceInput
                value={input}
                status={status}
                onChange={setInput}
                onDecrement={decrement}
                onIncrement={increment}
              />
              <span className="shrink-0">
                <BetActionButton variant={actionVariant(status)} onClick={toggleBooking} />
              </span>
            </div>
          </div>
          <BetHint status={status} bookedCount={bookedCount} />
        </div>
      </div>

      <div className="border-t border-solid border-border-dashed" aria-hidden="true" />

      <div className="px-7">
        {bookedCount === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center font-mono text-[16px] font-bold text-text-primary">
              Make prediction | {countdown}
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-2 font-mono text-[16px] font-bold text-text-focus outline-none"
            >
              <img src={linkIcon} alt="" aria-hidden="true" className="h-4 w-4" />
              {copied ? 'Link copied!' : 'Copy game link'}
            </button>
          </div>
        ) : (
          <PredictionButton label={`Buy tickets | ${countdown}`} to="/buy" />
        )}
      </div>
    </footer>
  )
}
