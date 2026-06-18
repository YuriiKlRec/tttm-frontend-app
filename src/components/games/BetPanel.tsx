import { useEffect, type FC } from 'react'
import { PriceInput } from './PriceInput'
import { BetActionButton } from './BetActionButton'
import { BetHint } from './BetHint'
import { PredictionButton } from '../ui/PredictionButton'
import { useBetPanel } from '../../hooks/useBetPanel'
import { useNow } from '../../hooks/useNow'
import { formatCountdown } from '../../utils/time'
import ticketIcon from '../../assets/icon-ticket.svg'
import btcIcon from '../../assets/icon-btc.svg'

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
  presetPrice,
  onPriceChange,
}) => {
  const {
    input,
    bookedPrices,
    status,
    setInput,
    decrement,
    increment,
    toggleBooking,
    applyExternal,
  } = useBetPanel({ takenByOthers, yourTickets, onPriceChange })
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

  const bookedCount = bookedPrices.length
  const countdown = formatCountdown(betCloseTime - now)

  return (
    <footer
      className="relative z-20 flex w-full flex-col gap-4 border-t border-border-dashed bg-surface py-4"
      style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 16px)' }}
    >
      <div className="flex flex-col gap-4 px-7">
        <p className="flex items-center justify-center gap-2">
          <img src={ticketIcon} alt="" aria-hidden="true" className="w-6" />
          {bookedCount === 0 ? (
            <span className="font-mono text-[15px] text-text-primary">= {ticketPrice} TON</span>
          ) : (
            <span className="font-mono text-[15px] text-text-focus">
              Booked: {bookedCount} | {ticketPrice} TON
            </span>
          )}
        </p>

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
          <p className="text-center font-mono text-[16px] font-bold text-text-primary">
            Make prediction | {countdown}
          </p>
        ) : (
          <PredictionButton label={`Buy tickets | ${countdown}`} />
        )}
      </div>
    </footer>
  )
}
