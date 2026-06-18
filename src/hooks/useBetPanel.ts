import { useMemo, useState } from 'react'
import {
  includesPrice,
  parsePrice,
  removePrice,
  resolvePriceStatus,
  sanitizePriceInput,
  type PriceStatus,
} from '../utils/price'

/** Вхідні дані хука керування панеллю ставки. */
interface UseBetPanelArgs {
  /** Ціни, зайняті іншими гравцями. */
  takenByOthers: number[]
  /** Ціни квитків поточного користувача. */
  yourTickets: number[]
  /** Емітується ТІЛЬКИ при діях користувача над полем (ввід/степери). */
  onPriceChange?: (price: number) => void
}

/** Публічний стан і дії панелі ставки. */
interface UseBetPanelResult {
  /** Сире значення поля вводу. */
  input: string
  /** Накопичені заброньовані ціни. */
  bookedPrices: number[]
  /** Статус поточної введеної ціни. */
  status: PriceStatus
  /** Зміна тексту вводу (санітизується). */
  setInput: (raw: string) => void
  /** Крок −1 TON (не нижче 0). */
  decrement: () => void
  /** Крок +1 TON. */
  increment: () => void
  /** Перемикає бронювання поточної ціни (додає/прибирає). */
  toggleBooking: () => void
  /** Встановлює поле із зовнішнього джерела (графік) БЕЗ емісії onPriceChange. */
  applyExternal: (price: number) => void
}

/**
 * Інкапсулює стан панелі ставки: ввід ціни, степер ±1, накопичення
 * заброньованих цін та обчислення статусу введеної ціни.
 */
export const useBetPanel = ({
  takenByOthers,
  yourTickets,
  onPriceChange,
}: UseBetPanelArgs): UseBetPanelResult => {
  const [input, setInputState] = useState('')
  const [bookedPrices, setBookedPrices] = useState<number[]>([])

  const price = parsePrice(input)
  const status = useMemo(
    () => resolvePriceStatus(price, takenByOthers, yourTickets, bookedPrices),
    [price, takenByOthers, yourTickets, bookedPrices],
  )

  // Емітує ціну назовні (синк з графіком) лише для валідних чисел.
  const emit = (value: number): void => {
    if (onPriceChange && Number.isFinite(value)) {
      onPriceChange(value)
    }
  }

  const setInput = (raw: string): void => {
    const sanitized = sanitizePriceInput(raw)
    setInputState(sanitized)
    emit(parsePrice(sanitized))
  }

  const stepTo = (next: number): void => {
    const clamped = Math.max(0, next)
    setInputState(clamped.toFixed(2))
    emit(clamped)
  }

  const decrement = (): void => {
    const base = Number.isFinite(price) ? price : 0
    stepTo(base - 1)
  }

  const increment = (): void => {
    const base = Number.isFinite(price) ? price : 0
    stepTo(base + 1)
  }

  const toggleBooking = (): void => {
    if (!Number.isFinite(price) || price <= 0) {
      return
    }
    setBookedPrices((prev) =>
      includesPrice(prev, price) ? removePrice(prev, price) : [...prev, price],
    )
  }

  // Синк зовнішнього значення (графік→поле) БЕЗ зворотної емісії — глушить цикл.
  // Не переписує поле, якщо воно вже відповідає ціні — інакше ламало б ввід
  // користувача (відлуння через presetPrice переформатовувало б кожен символ).
  const applyExternal = (value: number): void => {
    if (Number.isFinite(price) && Math.abs(price - value) < 0.005) {
      return
    }
    setInputState(value.toFixed(2))
  }

  return {
    input,
    bookedPrices,
    status,
    setInput,
    decrement,
    increment,
    toggleBooking,
    applyExternal,
  }
}
