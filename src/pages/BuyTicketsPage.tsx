import { useEffect, useMemo, useState, type FC } from 'react'
import { BuyHeader } from '../components/buy/BuyHeader'
import { CheckSlides } from '../components/buy/CheckSlides'
import { BulletsPagination } from '../components/buy/BulletsPagination'
import { CheckActionPanel } from '../components/buy/CheckActionPanel'
import { BuyModals } from '../components/buy/BuyModals'
import { useBuyTicketsFlow } from '../hooks/useBuyTicketsFlow'
import { useBookedCart } from '../context/BookedCartProvider'
import { useLiveStore } from '../store/liveStore'
import { getGame } from '../services/gameApi'
import { MOCK_PRICES, MOCK_TAKEN, MOCK_TICKET_PRICE } from '../mocks/buyTickets'

/** Моковий зворотний відлік у шапці (без реального таймера). */
const MOCK_COUNTDOWN = '00:03:01'

/**
 * Сторінка оплати заброньованих ставок «Buy tickets». Читає ціни та gameId з
 * корзини (або DEV-мок), розбиває на чеки по 8, дозволяє керувати станами
 * ставок і виконує реальну TonConnect-транзакцію для кожного чека.
 * При 422 (ціна зайнята) — показує модалку «ALREADY TAKEN».
 */
const BuyTicketsPage: FC = () => {
  const cart = useBookedCart()
  const usingMock = cart.prices.length === 0
  const prices = useMemo(
    () => (usingMock ? MOCK_PRICES : cart.prices),
    [usingMock, cart.prices],
  )
  // Зайняті ставки демонструємо лише на моку (реально приходять із бекенда).
  const takenPrices = usingMock ? MOCK_TAKEN : []

  // Реальна ціна квитка: спочатку з live-стору (вже завантажена сторінка гри),
  // якщо відсутня — одноразовий fetch через gameApi.
  const liveGame = useLiveStore((s) => (cart.gameId ? s.games.get(cart.gameId) : undefined))
  const [fetchedTicketPrice, setFetchedTicketPrice] = useState<string | null>(null)

  useEffect(() => {
    // Якщо ціна вже є у live-сторі або гра невідома — fetch не потрібен
    if (!cart.gameId || liveGame?.ticketPrice) return

    let cancelled = false
    getGame(cart.gameId)
      .then((game) => {
        if (!cancelled) setFetchedTicketPrice(game.ticketPrice)
      })
      .catch(() => {
        // Не падаємо — залишаємо мок-фолбек
      })
    return () => {
      cancelled = true
    }
  }, [cart.gameId, liveGame?.ticketPrice])

  // Пріоритет: live-стор → одноразовий fetch → мок-фолбек
  const ticketPrice = liveGame?.ticketPrice ?? fetchedTicketPrice ?? MOCK_TICKET_PRICE

  const flow = useBuyTicketsFlow(prices, ticketPrice, takenPrices)
  const { checks } = flow
  const multipleChecks = checks.checks.length > 1

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
      <BuyHeader countdown={MOCK_COUNTDOWN} />

      <main className="relative z-10 flex-1 overflow-hidden">
        <CheckSlides checks={checks} onTicketInfo={flow.openTakenModal} />
      </main>

      {multipleChecks && (
        <div className="flex justify-center pb-3 pt-1">
          <BulletsPagination
            count={checks.checks.length}
            active={checks.activeIndex}
            onSelect={checks.goToCheck}
          />
        </div>
      )}

      <CheckActionPanel
        cta={flow.cta}
        onCta={flow.handleCta}
        showAddMore={flow.showAddMore}
        onAddMore={flow.openUncompleted}
        splitNote={multipleChecks ? `Splitted into ${checks.checks.length} payments` : undefined}
      />

      {flow.payError && (
        <p
          role="alert"
          className="absolute bottom-[80px] left-0 right-0 px-7 text-center font-mono text-[13px] text-[#E5484D]"
        >
          {flow.payError}
        </p>
      )}

      <BuyModals
        active={flow.activeModal}
        onClose={flow.closeModal}
        onConfirmUncompleted={flow.confirmUncompleted}
      />
    </div>
  )
}

export default BuyTicketsPage
