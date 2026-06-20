import { useMemo, type FC } from 'react'
import { BuyHeader } from '../components/buy/BuyHeader'
import { CheckSlides } from '../components/buy/CheckSlides'
import { BulletsPagination } from '../components/buy/BulletsPagination'
import { CheckActionPanel } from '../components/buy/CheckActionPanel'
import { BuyModals } from '../components/buy/BuyModals'
import { useBuyTicketsFlow } from '../hooks/useBuyTicketsFlow'
import { useBookedCart } from '../context/BookedCartProvider'
import { MOCK_PRICES, MOCK_TAKEN, MOCK_TICKET_PRICE } from '../mocks/buyTickets'

/** Моковий зворотний відлік у шапці (без реального таймера). */
const MOCK_COUNTDOWN = '00:03:01'

/**
 * Сторінка оплати заброньованих ставок «Buy tickets». Читає ціни з корзини
 * (або DEV-мок), розбиває на чеки по 8, дозволяє керувати станами ставок та
 * імітує пооплату чеків. Гаманець — TonConnect, оплата — мокова.
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

  const flow = useBuyTicketsFlow(prices, MOCK_TICKET_PRICE, takenPrices)
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

      <BuyModals
        active={flow.activeModal}
        onClose={flow.closeModal}
        onConfirmUncompleted={flow.confirmUncompleted}
      />
    </div>
  )
}

export default BuyTicketsPage
