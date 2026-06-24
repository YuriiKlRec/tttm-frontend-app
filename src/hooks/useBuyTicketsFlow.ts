import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'
import { useTicketChecks } from './useTicketChecks'
import { useBookedCart } from '../context/BookedCartProvider'
import { prepareTicketTx, createTickets } from '../services/ticketApi'
import { ValidationError } from '../services/http'
import type { CheckCta } from '../components/buy/CheckActionPanel'

/** Тип відкритої модалки на сторінці оплати. */
export type ActiveModal = 'taken' | 'uncompleted' | null

/** Маршрут повернення до гри (fallback якщо gameId невідомий). */
const GAME_ROUTE_FALLBACK = '/'

/** Часовий ліміт транзакції (сек) — 5 хвилин. */
const TX_VALID_SECONDS = 300

/** Похідний стан і обробники сторінки оплати. */
export interface BuyTicketsFlow {
  checks: ReturnType<typeof useTicketChecks>
  connected: boolean
  activeModal: ActiveModal
  /** CTA для активного чека. */
  cta: CheckCta
  /** Чи показувати «Add more» (ховаємо на success). */
  showAddMore: boolean
  /** Чи виконується оплата поточного чека. */
  paying: boolean
  /** Помилка останньої транзакції (або null). */
  payError: string | null
  /** Натискання основної CTA. */
  handleCta: () => void
  openTakenModal: () => void
  openUncompleted: () => void
  confirmUncompleted: () => void
  closeModal: () => void
}

/**
 * Оркеструє сторінку оплати: стан гаманця (TonConnect), модалки та логіку
 * контекстної CTA активного чека (connect/pay/next/back). Оплата реальна —
 * prepareTicketTx → sendTransaction → createTickets. При 422 (ціна зайнята)
 * відкриває модалку «ALREADY TAKEN» і позначає відповідний тікет як taken.
 * Уся бізнес-логіка сторінки зосереджена тут.
 */
export const useBuyTicketsFlow = (
  prices: number[],
  ticketPrice: string,
  takenPrices: number[],
): BuyTicketsFlow => {
  const navigate = useNavigate()
  const cart = useBookedCart()
  const checks = useTicketChecks(prices, ticketPrice, takenPrices)

  const [tonConnectUI] = useTonConnectUI()
  const address = useTonAddress()
  const connected = address !== ''

  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const activeCheck = checks.checks[checks.activeIndex]
  const summary = activeCheck ? checks.summaryOf(activeCheck) : undefined
  const isPaid = activeCheck?.status === 'paid'

  // Чи є ще pending-чеки, окрім активного (для вибору next/back).
  const hasOtherPending = useMemo(
    () => checks.checks.some((c, i) => i !== checks.activeIndex && c.status === 'pending'),
    [checks.checks, checks.activeIndex],
  )

  // Обчислення контекстної CTA активного чека.
  const cta = useMemo<CheckCta>(() => {
    if (isPaid) {
      return hasOtherPending ? { kind: 'next' } : { kind: 'back' }
    }
    if (!connected) {
      return { kind: 'connect' }
    }
    if (summary && summary.activeCount > 0) {
      return { kind: 'pay' }
    }
    return hasOtherPending ? { kind: 'next' } : { kind: 'back' }
  }, [isPaid, connected, summary, hasOtherPending])

  const closeModal = useCallback(() => setActiveModal(null), [])

  /**
   * Реальна оплата активного чека:
   *   1. prepareTicketTx — отримати payload
   *   2. sendTransaction — відправити через TonConnect
   *   3. createTickets   — зберегти у БД (передати boc)
   * При ValidationError (422) — показати ALREADY TAKEN, позначити ціну taken.
   * При відмові користувача — тихо вийти.
   */
  const payCurrentCheck = useCallback(async (): Promise<void> => {
    if (!activeCheck || !summary || summary.activeCount === 0 || paying) {
      return
    }

    const gameId = cart.gameId
    if (!gameId) {
      setPayError('gameId невідомий — поверніться до гри')
      return
    }

    setPayError(null)
    setPaying(true)

    try {
      const activePrices = summary.activePrices

      // Крок 1: підготовка транзакції.
      const txResp = await prepareTicketTx({ gameId, prices: activePrices })

      // Крок 2: відправка через TonConnect.
      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + TX_VALID_SECONDS,
        messages: [
          {
            address: txResp.to,
            amount: txResp.value,
            payload: txResp.payload,
            stateInit: txResp.stateInit ?? undefined,
          },
        ],
      })

      // Крок 3: збереження квитків у БД.
      await createTickets({
        gameId,
        prices: activePrices,
        boc: result.boc,
      })

      // Успіх — позначити чек як оплачений.
      checks.payCheck(checks.activeIndex, false)
    } catch (err) {
      // Відмова користувача від транзакції — не показуємо помилку.
      if (
        err instanceof Error &&
        (err.message.includes('User declined') ||
          err.message.includes('Reject') ||
          err.message.includes('Transaction was not sent'))
      ) {
        return
      }

      // 422 від prepareTicketTx — ціна вже зайнята.
      if (err instanceof ValidationError) {
        setActiveModal('taken')
        checks.payCheck(checks.activeIndex, true)
        return
      }

      setPayError(err instanceof Error ? err.message : 'Помилка оплати')
    } finally {
      setPaying(false)
    }
  }, [activeCheck, summary, paying, cart.gameId, tonConnectUI, checks])

  const handleCta = useCallback((): void => {
    if (cta.kind === 'connect') {
      void tonConnectUI.openModal()
      return
    }
    if (cta.kind === 'pay') {
      void payCurrentCheck()
      return
    }
    if (cta.kind === 'next') {
      checks.goToNextPending()
      return
    }
    // back: перейти до гри.
    const route = cart.gameId ? `/game/${cart.gameId}` : GAME_ROUTE_FALLBACK
    navigate(route)
  }, [cta.kind, checks, tonConnectUI, payCurrentCheck, cart.gameId, navigate])

  const openTakenModal = useCallback(() => setActiveModal('taken'), [])
  const openUncompleted = useCallback(() => setActiveModal('uncompleted'), [])

  // Підтвердження виходу: прибрати з корзини всі неактивні+зайняті ставки.
  const confirmUncompleted = useCallback((): void => {
    cart.removeMany(checks.nonActivePrices)
    setActiveModal(null)
    const route = cart.gameId ? `/game/${cart.gameId}` : GAME_ROUTE_FALLBACK
    navigate(route)
  }, [cart, checks.nonActivePrices, navigate])

  return {
    checks,
    connected,
    activeModal,
    cta,
    paying,
    payError,
    showAddMore: !isPaid,
    handleCta,
    openTakenModal,
    openUncompleted,
    confirmUncompleted,
    closeModal,
  }
}
