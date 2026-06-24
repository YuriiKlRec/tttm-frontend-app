import { useEffect, useMemo, useRef, useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuyHeader } from '../components/buy/BuyHeader'
import { CheckSlides } from '../components/buy/CheckSlides'
import { BulletsPagination } from '../components/buy/BulletsPagination'
import { CheckActionPanel } from '../components/buy/CheckActionPanel'
import { BuyModals } from '../components/buy/BuyModals'
import { useBuyTicketsFlow } from '../hooks/useBuyTicketsFlow'
import { useBookedCart } from '../context/BookedCartProvider'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import { useLiveStore } from '../store/liveStore'
import { getGame } from '../services/gameApi'
import { formatCountdown } from '../utils/time'
import { env } from '../config/env'
import type { GameDetail } from '../types/game'

/**
 * Сторінка оплати заброньованих ставок «Buy tickets». Читає ціни та gameId з
 * корзини, розбиває на чеки по 8, дозволяє керувати станами ставок і виконує
 * реальну TonConnect-транзакцію для кожного чека.
 * При 422 (ціна зайнята) — показує модалку «ALREADY TAKEN».
 *
 * Порожня корзина або відсутній gameId → редирект на головну «/».
 */
const BuyTicketsPage: FC = () => {
  const cart = useBookedCart()
  const navigate = useNavigate()

  // ─── Редирект: тільки при монтуванні (не реагуємо на подальші зміни корзини) ──
  // Після оплати cart.prices порожніє, але користувач ще на success-екрані —
  // реактивний редирект закидував би його на головну. Тому перевіряємо стан
  // лише один раз через ref, а useEffect спрацьовує без залежностей від cart.
  const shouldRedirect = useRef(cart.prices.length === 0 || !cart.gameId)
  useEffect(() => {
    if (shouldRedirect.current) {
      navigate('/', { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  // ─── Реальна ціна квитка та зайняті ставки ────────────────────────────────
  // Спочатку шукаємо вже завантажений GameDetail у live-сторі.
  const liveGame = useLiveStore((s) =>
    cart.gameId ? s.games.get(cart.gameId) : undefined,
  )

  // Одноразово fetch-нутий GameDetail (якщо live-стор ще не має гри).
  const [fetchedGame, setFetchedGame] = useState<GameDetail | null>(null)

  useEffect(() => {
    // Якщо gra вже є у live-сторі — fetch не потрібен
    if (!cart.gameId || liveGame) return

    let cancelled = false
    getGame(cart.gameId)
      .then((game) => {
        if (!cancelled) setFetchedGame(game)
      })
      .catch(() => {
        // Не падаємо — ticketPrice та takenByOthers залишаться undefined
      })
    return () => {
      cancelled = true
    }
  }, [cart.gameId, liveGame])

  // Пріоритет: live-стор → одноразовий fetch
  const ticketPrice = liveGame?.ticketPrice ?? fetchedGame?.ticketPrice ?? ''
  const takenPrices: number[] =
    liveGame?.takenByOthers ?? fetchedGame?.takenByOthers ?? []

  // ─── Ціни з корзини ───────────────────────────────────────────────────────
  const prices = useMemo(() => cart.prices, [cart.prices])

  // ─── Реальний зворотний відлік ────────────────────────────────────────────
  // Час початку: фіксується одноразово при монтуванні компонента.
  const [startedAt] = useState<number>(() => Date.now())
  const timeoutMs = env.paymentTimeoutMinutes * 60 * 1000
  const [remainingMs, setRemainingMs] = useState<number>(timeoutMs)

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const left = Math.max(0, timeoutMs - elapsed)
      setRemainingMs(left)

      if (left === 0) {
        clearInterval(id)
        // Відлік вичерпано — повертаємось до гри або на головну
        const target = cart.gameId ? `/game/${cart.gameId}` : '/'
        navigate(target, { replace: true })
      }
    }, 1000)

    return () => clearInterval(id)
  }, [startedAt, timeoutMs, cart.gameId, navigate])

  const countdown = formatCountdown(remainingMs)

  // ─── Flow ─────────────────────────────────────────────────────────────────
  const flow = useBuyTicketsFlow(prices, ticketPrice, takenPrices)
  const { checks } = flow
  const multipleChecks = checks.checks.length > 1

  // ─── Telegram back: власний обробник для /buy (уникаємо подвійного керування) ──
  useTelegramBackButton(flow.leaveToGame)

  // Не рендеримо сторінку, якщо корзина порожня (редирект вже запущено).
  if (!cart.gameId || cart.prices.length === 0) return null

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
      <BuyHeader countdown={countdown} />

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
        onAddMore={flow.leaveToGame}
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
