import { useCallback, useMemo, useState } from 'react'
import { useT } from '../i18n/useT'
import { clamp } from '../utils/time'
import { ceilToHour, HOUR_MS, MINUTE_MS } from '../utils/datetime'

/** Мінімальний відступ deadline від країв проміжку (хв). */
const OFFSET_EDGE = 5

/** Мінімум до prediction time від «зараз» (хв). */
const MIN_LEAD_MINUTES = 10

/** Мінімальна ціна квитка (GRAM). */
const MIN_TICKET_PRICE = 0.1

/** Мінімальна довжина назви гри. */
const MIN_NAME_LENGTH = 3

/** Прапорці «торкнулись» для полів із відкладеним показом помилки. */
interface Touched {
  name: boolean
  time: boolean
  price: boolean
}

/** Початкове значення prediction time: ceil(now + 1h) до цілої години. */
const initialPredictionTime = (): number => ceilToHour(Date.now() + HOUR_MS)

/** Межі offset (хв) для заданої тривалості гри. */
const offsetBounds = (durationMinutes: number): { min: number; max: number } => ({
  min: OFFSET_EDGE,
  max: Math.max(OFFSET_EDGE, durationMinutes - OFFSET_EDGE),
})

/** Публічний стан/API форми створення гри. */
export interface CreateGameForm {
  name: string
  setName: (value: string) => void
  nameError: string | null
  predictionTime: number
  setPredictionTime: (epochMs: number) => void
  timeError: string | null
  deadline: number
  deadlineOffset: number
  deadlineMin: number
  deadlineMax: number
  setDeadlineOffset: (minutes: number) => void
  ticketPrice: string
  setTicketPrice: (value: string) => void
  priceError: string | null
  pool: number
  setPool: (value: number) => void
  blurName: () => void
  blurPrice: () => void
  isValid: boolean
  isDirty: boolean
}

/**
 * Інкапсулює стан, валідацію та похідні обчислення форми «New prediction game».
 * deadline працює через offset = (predictionTime − deadline) у хвилинах,
 * межі offset перераховуються від тривалості (predictionTime − now).
 */
export const useCreateGameForm = (): CreateGameForm => {
  const { t } = useT()
  const [now] = useState(() => Date.now())
  const [name, setNameRaw] = useState('')
  const [predictionTime, setPredictionTimeRaw] = useState(initialPredictionTime)
  // null => offset не чіпали (тримаємо половину); число => вибране користувачем.
  const [manualOffset, setManualOffset] = useState<number | null>(null)
  const [ticketPrice, setTicketPriceRaw] = useState('1')
  const [pool, setPool] = useState(30)
  const [touched, setTouched] = useState<Touched>({ name: false, time: false, price: false })
  const [dirty, setDirty] = useState(false)

  const durationMinutes = useMemo(
    () => Math.round((predictionTime - now) / MINUTE_MS),
    [predictionTime, now],
  )
  const { min: deadlineMin, max: deadlineMax } = useMemo(
    () => offsetBounds(durationMinutes),
    [durationMinutes],
  )

  // Поточний offset: половина проміжку за замовчуванням, інакше — клампований ручний.
  const deadlineOffset = useMemo(() => {
    const fallback = Math.round(durationMinutes / 2)
    const value = manualOffset ?? fallback
    return clamp(value, deadlineMin, deadlineMax)
  }, [manualOffset, durationMinutes, deadlineMin, deadlineMax])

  const deadline = predictionTime - deadlineOffset * MINUTE_MS

  const setName = useCallback((value: string) => {
    setNameRaw(value)
    setDirty(true)
  }, [])

  const setPredictionTime = useCallback((epochMs: number) => {
    setPredictionTimeRaw(epochMs)
    setTouched((s) => ({ ...s, time: true }))
    setDirty(true)
  }, [])

  const setDeadlineOffset = useCallback((minutes: number) => {
    setManualOffset(minutes)
    setDirty(true)
  }, [])

  const setTicketPrice = useCallback((value: string) => {
    setTicketPriceRaw(value)
    setDirty(true)
  }, [])

  const blurName = useCallback(() => setTouched((s) => ({ ...s, name: true })), [])
  const blurPrice = useCallback(() => setTouched((s) => ({ ...s, price: true })), [])

  const onSetPool = useCallback((value: number) => {
    setPool(value)
    setDirty(true)
  }, [])

  // --- Валідація ---
  const nameValid = name.trim().length >= MIN_NAME_LENGTH
  const priceNum = Number(ticketPrice)
  const priceValid = Number.isFinite(priceNum) && priceNum >= MIN_TICKET_PRICE
  const timeValid = predictionTime - now >= MIN_LEAD_MINUTES * MINUTE_MS

  const nameError = touched.name && !nameValid ? t('createGame.nameError') : null
  const priceError = touched.price && !priceValid ? t('createGame.priceError') : null
  const timeError = touched.time && !timeValid ? t('createGame.timeError') : null

  const isValid = nameValid && priceValid && timeValid

  return {
    name,
    setName,
    nameError,
    predictionTime,
    setPredictionTime,
    timeError,
    deadline,
    deadlineOffset,
    deadlineMin,
    deadlineMax,
    setDeadlineOffset,
    ticketPrice,
    setTicketPrice,
    priceError,
    pool,
    setPool: onSetPool,
    blurName,
    blurPrice,
    isValid,
    isDirty: dirty,
  }
}
