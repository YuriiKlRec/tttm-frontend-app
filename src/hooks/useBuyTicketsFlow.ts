import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'
import { useTicketChecks } from './useTicketChecks'
import { useBookedCart } from '../context/BookedCartProvider'
import type { CheckCta } from '../components/buy/CheckActionPanel'

/** Тип відкритої модалки на сторінці оплати. */
export type ActiveModal = 'taken' | 'uncompleted' | null

/** Маршрут повернення до гри. */
const GAME_ROUTE = '/game/1'

/** Похідний стан і обробники сторінки оплати. */
export interface BuyTicketsFlow {
  checks: ReturnType<typeof useTicketChecks>
  connected: boolean
  activeModal: ActiveModal
  /** CTA для активного чека. */
  cta: CheckCta
  /** Чи показувати «Add more» (ховаємо на success). */
  showAddMore: boolean
  /** Натискання основної CTA. */
  handleCta: () => void
  openTakenModal: () => void
  openUncompleted: () => void
  confirmUncompleted: () => void
  closeModal: () => void
}

/**
 * Оркеструє сторінку оплати: стан гаманця (TonConnect), модалки та логіку
 * контекстної CTA активного чека (connect/pay/next/back). Оплата імітується
 * локально. Уся бізнес-логіка сторінки зосереджена тут.
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

  const handleCta = useCallback((): void => {
    if (cta.kind === 'connect') {
      void tonConnectUI.openModal()
      return
    }
    if (cta.kind === 'pay') {
      checks.payCheck(checks.activeIndex, false)
      return
    }
    if (cta.kind === 'next') {
      checks.goToNextPending()
      return
    }
    navigate(GAME_ROUTE)
  }, [cta.kind, checks, tonConnectUI, navigate])

  const openTakenModal = useCallback(() => setActiveModal('taken'), [])
  const openUncompleted = useCallback(() => setActiveModal('uncompleted'), [])

  // Підтвердження виходу: прибрати з корзини всі неактивні+зайняті ставки.
  const confirmUncompleted = useCallback((): void => {
    cart.removeMany(checks.nonActivePrices)
    setActiveModal(null)
    navigate(GAME_ROUTE)
  }, [cart, checks.nonActivePrices, navigate])

  return {
    checks,
    connected,
    activeModal,
    cta,
    showAddMore: !isPaid,
    handleCta,
    openTakenModal,
    openUncompleted,
    confirmUncompleted,
    closeModal,
  }
}
