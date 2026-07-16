import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'
import { useTicketChecks, CHUNK_SIZE } from './useTicketChecks'
import { useBookedCart } from '../context/BookedCartProvider'
import { useLiveStore } from '../store/liveStore'
import { prepareTicketTx, createTickets } from '../services/ticketApi'
import { ValidationError } from '../services/http'
import { isUserRejection } from '../utils/isUserRejection'
import { chunk } from '../utils/chunk'
import { goBackOrFallback } from '../utils/navigation'
import { useT } from '../i18n/useT'
import { trackEvent } from '../services/analytics'
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
  /**
   * Безпечний вихід до гри: якщо є скасовані ставки — показує попередження,
   * інакше одразу переходить до маршруту гри.
   */
  leaveToGame: () => void
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
  const { t } = useT()
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
      setPayError(t('errors.gameIdUnknown'))
      return
    }

    setPayError(null)
    setPaying(true)

    try {
      // Інваріант: кожен чек містить ≤ CHUNK_SIZE (8) цін — useTicketChecks
      // розбиває prices через chunk(prices, CHUNK_SIZE) під час ініціалізації.
      // Захисне розбиття на випадок, якщо інваріант порушено зовні.
      const activePrices = summary.activePrices
      const groups =
        activePrices.length <= CHUNK_SIZE
          ? [activePrices]
          : chunk(activePrices, CHUNK_SIZE)

      for (const group of groups) {
        // Крок 1: підготовка транзакції.
        const txResp = await prepareTicketTx({ gameId, prices: group })

        // Крок 2: відправка через TonConnect.
        // При відмові користувача — кидає помилку, яку ловимо нижче.
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

        // Крок 3: збереження квитків у БД (транзакція вже відправлена).
        // 422 тут означає гонку цін — показуємо ALREADY TAKEN так само,
        // як і при 422 на етапі підготовки.
        try {
          await createTickets({
            gameId,
            prices: group,
            boc: result.boc,
          })
        } catch (postErr) {
          if (postErr instanceof ValidationError) {
            // Транзакція пішла в мережу, але ціна вже зайнята — ті самі дії.
            setActiveModal('taken')
            checks.payCheck(checks.activeIndex, true)
            return
          }
          throw postErr
        }

        // Аналітика: одна подія на кожен успішно оплачений чанк (createTickets
        // підтвердив збереження у БД) — чек може містити кілька чанків по
        // CHUNK_SIZE (8) цін, тож саме чанк, а не весь ордер, є природною
        // одиницею "успішної покупки" в наявному коді.
        const amountGram = Number(ticketPrice) * group.length
        trackEvent('bet_placed', {
          game_id: gameId,
          tickets_count: group.length,
          amount_gram: Number.isFinite(amountGram) ? amountGram : null,
        })

        // Захист від гонки/кешу (див. liveStore.ts:mergeConfirmedMine): щойно
        // createTickets підтвердив оплату — позначаємо кожну ціну групи як
        // "мою" в liveStore. Це гарантує, що жоден майбутній REST-рефетч чи
        // socket-подія (навіть застарілі/поза чергою) більше НІКОЛИ не
        // покажуть цю ставку як зайняту чужу чи "не оплачену" — незалежно від
        // того, чи gameId уже завантажений у liveStore на цей момент.
        for (const price of group) {
          useLiveStore.getState().confirmMyTicket(gameId, price)
        }
      }

      // Успіх — позначити чек як оплачений і одразу прибрати оплачені ціни з корзини.
      // useTicketChecks ігнорує подальші зміни prices, тому UI чека не змінюється.
      checks.payCheck(checks.activeIndex, false)
      // Видаляємо всі активні ціни групи (вони щойно стали частиною paid-чека).
      const paidGroup = groups.flat()
      cart.removeMany(paidGroup)
    } catch (err) {
      // Відмова користувача від транзакції — тихо виходимо, без повідомлення.
      if (isUserRejection(err)) {
        return
      }

      // 422 від prepareTicketTx — ціна вже зайнята (до відправки).
      if (err instanceof ValidationError) {
        setActiveModal('taken')
        checks.payCheck(checks.activeIndex, true)
        return
      }

      setPayError(err instanceof Error ? err.message : t('errors.paymentFailed'))
    } finally {
      setPaying(false)
    }
  }, [activeCheck, summary, paying, cart, tonConnectUI, checks, t, ticketPrice])

  const openTakenModal = useCallback(() => setActiveModal('taken'), [])
  const openUncompleted = useCallback(() => setActiveModal('uncompleted'), [])

  // Безпечний вихід до гри: якщо є скасовані ставки — попередження,
  // інакше — одразу перехід. Оплачені вже видалені з корзини в payCurrentCheck.
  // goBackOrFallback (крок назад в історії, а не push нового запису) —
  // /buy завжди відкривається ЗІ сторінки гри, тож крок назад повертає саме
  // на неї, не накопичуючи дублікатів у стеку (див. B1: інакше Back із гри
  // після оплати знову впирався в /buy замість лобі).
  const leaveToGame = useCallback((): void => {
    if (checks.nonActivePrices.length > 0) {
      setActiveModal('uncompleted')
      return
    }
    const fallback = cart.gameId ? `/game/${cart.gameId}` : GAME_ROUTE_FALLBACK
    goBackOrFallback(navigate, fallback)
  }, [checks.nonActivePrices, cart.gameId, navigate])

  // Підтвердження виходу: прибрати скасовані ставки (оплачені вже видалено).
  const confirmUncompleted = useCallback((): void => {
    cart.removeMany(checks.nonActivePrices)
    setActiveModal(null)
    const fallback = cart.gameId ? `/game/${cart.gameId}` : GAME_ROUTE_FALLBACK
    goBackOrFallback(navigate, fallback)
  }, [cart, checks.nonActivePrices, navigate])

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
    // back: безпечний вихід із попередженням про скасовані ставки.
    leaveToGame()
  }, [cta.kind, checks, tonConnectUI, payCurrentCheck, leaveToGame])

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
    leaveToGame,
  }
}
