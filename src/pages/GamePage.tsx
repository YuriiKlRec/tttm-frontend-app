import { useEffect, useMemo, useState, type FC } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { GameLayout } from '../components/layout/GameLayout'
import { GameHeader } from '../components/games/GameHeader'
import { BetPanel } from '../components/games/BetPanel'
import { GameContent } from '../components/games/GameContent'
import { CartPanel } from '../components/games/cart/CartPanel'
import { ClosestPredictions } from '../components/games/ClosestPredictions'
import { useChartData } from '../hooks/useChartData'
import { useNow } from '../hooks/useNow'
import { useBookedCart } from '../context/BookedCartProvider'
import { useAuth } from '../hooks/useAuth'
import { useGameLive } from '../hooks/useGameLive'
import { useInfiniteTickets } from '../hooks/useInfiniteTickets'
import { useLiveStore } from '../store/liveStore'
import { centsToUsd } from '../utils/units'
import { formatInTz } from '../utils/datetime'
import type { Timeframe } from '../services/binance'
import type { ViewMode, DetailGroup, Bet } from '../types/game'
import type { WaitBet } from '../types/wait'

/** Запасна торгова пара для графіка — використовується якщо targetCurrency відсутній у грі. */
const FALLBACK_SYMBOL = 'BTCUSDT'

/**
 * Стабільний порожній масив ставок — використовується як fallback у селекторі
 * liveStore, щоб уникнути нового посилання на кожен рендер (Zustand infinite loop).
 */
const EMPTY_BETS: Bet[] = []

/** Фаза гри: прийом ставок / очікування фіналізації / завершено. */
type GamePhase = 'active' | 'waiting' | 'finished'

/**
 * Обчислює фазу гри на основі часів GameDetail та поточного моменту (epoch ms).
 * Дублює семантику derivePhase, але працює з вже замапленими полями GameDetail.
 */
function computePhase(betCloseTime: number, endTime: number, now: number): GamePhase {
  if (now >= endTime) return 'finished'
  if (now >= betCloseTime) return 'waiting'
  return 'active'
}

/**
 * Будує групи деталей гри для вигляду «Details».
 * Для завершеної гри додає першу групу з результатами.
 * Поля, що не заповнені — пропускаються.
 * @param tz — часовий пояс користувача (з useAuth); null → браузерний TZ.
 */
function buildDetailGroups(
  game: {
    ticketPrice: string
    betCloseTime: number
    endTime: number
    organizer?: string
    prize?: string
    ticketsTotal?: number
    authorPercent?: number
    finalPrice?: string | null
    winnerNickname?: string | null
    winnerTicketPrice?: string | null
  },
  finished: boolean,
  tz: string | null,
): DetailGroup[] {
  const groups: DetailGroup[] = []

  // Група результату (лише для завершеної гри)
  if (finished) {
    const resultGroup: DetailGroup = []
    if (game.winnerNickname) {
      resultGroup.push({ label: 'Winner', value: game.winnerNickname })
    }
    if (game.finalPrice) {
      resultGroup.push({ label: 'BTC/USDT price', value: game.finalPrice })
    }
    if (game.winnerTicketPrice) {
      resultGroup.push({ label: 'Winner ticket', value: game.winnerTicketPrice })
    }
    if (resultGroup.length > 0) {
      groups.push(resultGroup)
    }
  }

  // Часова група — дати через formatInTz для консистентного TZ
  const timeGroup: DetailGroup = [
    {
      label: 'Price prediction date/time',
      value: formatInTz(game.endTime, tz),
    },
    {
      label: 'Stop receiving predictions',
      value: formatInTz(game.betCloseTime, tz),
    },
    { label: 'Oracle / price source', value: 'Binance' },
  ]
  groups.push(timeGroup)

  // Група призу
  const prizeGroup: DetailGroup = []
  if (game.prize) {
    prizeGroup.push({ label: 'Reward', value: game.prize })

    // Розподіл призового фонду між переможцем та організатором.
    // Формула відповідає старому фронтенду (frontend/src/hooks/useGameCalc.ts):
    //   organizerShare = pool * authorPercent / 100
    //   winnerShare = pool - organizerShare
    if (game.authorPercent !== undefined) {
      const pool = parseFloat(game.prize)
      if (Number.isFinite(pool)) {
        const organizerShare = pool * game.authorPercent / 100
        const winnerShare = pool - organizerShare
        prizeGroup.push({ label: "Winner's share", value: `${winnerShare.toFixed(2)} TON` })
        prizeGroup.push({ label: "Organizer's share", value: `${organizerShare.toFixed(2)} TON` })
      }
    }
  }
  if (game.ticketsTotal !== undefined) {
    prizeGroup.push({ label: 'Number of tickets', value: String(game.ticketsTotal) })
  }
  prizeGroup.push({ label: 'Ticket price', value: `${game.ticketPrice} TON` })
  groups.push(prizeGroup)

  // Організатор
  if (game.organizer) {
    groups.push([{ label: 'Organizer', value: game.organizer }])
  }

  return groups
}

/**
 * Окрема сторінка гри `/game/:id` (поза AppLayout): шапка з відліком і перемикачем
 * виду, інтерактивний графік ціни BTC у центрі та підвал ставки.
 * Дані гри — з useGameLive (REST + real-time Socket.IO), дані графіка — з Binance.
 */
const GamePage: FC = () => {
  const { id = '' } = useParams<{ id: string }>()
  const { user, tz } = useAuth()
  const myUserId = user?.id ?? null

  const { game, ready } = useGameLive(id, myUserId)

  const [searchParams] = useSearchParams()
  // Початковий вид: ?view=predictions відкриває список ставок
  const initialView: ViewMode = searchParams.get('view') === 'predictions' ? 'bets' : 'chart'
  const [rawViewMode, setViewMode] = useState<ViewMode>(initialView)
  const [timeframe, setTimeframe] = useState<Timeframe>('1m')
  // Фільтр «лише мої ставки» — керується кнопкою в шапці (вид Predictions)
  const [mineOnly, setMineOnly] = useState(false)

  const now = useNow()

  // Фаза гри обчислюється з реальних часів GameDetail
  const phase: GamePhase = game
    ? computePhase(game.betCloseTime, game.endTime, now)
    : 'active'

  const finished = phase === 'finished'

  // У завершеній грі вид «графік» недоступний
  const viewMode: ViewMode = finished && rawViewMode === 'chart' ? 'bets' : rawViewMode
  const viewOptions: ViewMode[] | undefined = finished ? ['bets', 'details'] : undefined

  // Список ставок із безперервним завантаженням
  const winningTicketId = game?.winningTicketId ?? null
  const { bets: pagedBets, sentinelRef } = useInfiniteTickets(
    id,
    mineOnly,
    myUserId,
    winningTicketId,
    ready,
  )

  // Real-time тікети зі стора (game:ticket_added / ticket:created).
  // EMPTY_BETS — стабільна константа; не вбудований літерал [], щоб Zustand
  // не отримував нове посилання щорендер і не падав в infinite loop.
  const liveBets = useLiveStore((s) => s.ticketsByGame.get(id) ?? EMPTY_BETS)

  // Об'єднуємо: живі тікети спереду, пагіновані — позаду (дедуплікація за rank+user)
  const bets: Bet[] = useMemo(() => {
    if (liveBets.length === 0) return pagedBets
    const liveSet = new Set(liveBets.map((b) => `${b.user}-${b.price}`))
    const filtered = pagedBets.filter((b) => !liveSet.has(`${b.user}-${b.price}`))
    return [...liveBets, ...filtered]
  }, [liveBets, pagedBets])

  // Єдине джерело правди для вибраної ціни
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>(undefined)
  // Корзина заброньованих ставок
  const cart = useBookedCart()
  const [cartOpen, setCartOpen] = useState(false)

  // Синхронізуємо gameId корзини при відкритті гри — BuyTicketsPage читає його звідти.
  useEffect(() => {
    if (id) {
      cart.setGameId(id)
    }
  // cart стабільний (useCallback), реагуємо лише на id
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Торгова пара береться з даних гри; FALLBACK_SYMBOL — якщо гра ще не завантажена
  const chartSymbol = game?.targetCurrency ?? FALLBACK_SYMBOL
  const { candles, currentPrice } = useChartData(chartSymbol, timeframe)

  // Маркери графіка: реальні тікети + заброньовані з корзини
  const chartBets = useMemo(() => {
    const yourPrices = game?.yourTickets ?? []
    const otherPrices = game?.takenByOthers ?? []
    const ticketMarkers = [
      ...yourPrices.map((price) => ({ price, mine: true, booked: false as const })),
      ...otherPrices.map((price) => ({ price, mine: false, booked: false as const })),
    ]
    const bookedMarkers = cart.prices.map((price) => ({
      price,
      mine: true as const,
      booked: true as const,
    }))
    return [...ticketMarkers, ...bookedMarkers]
  }, [game, cart.prices])

  // Стабільний геймовий контекст для графіка
  const chartGame = useMemo(
    () =>
      game
        ? {
            startTime: game.startTime,
            betOpenTime: game.betOpenTime,
            betCloseTime: game.betCloseTime,
            endTime: game.endTime,
          }
        : {
            startTime: now - 3_600_000,
            betOpenTime: now - 3_600_000,
            betCloseTime: now + 3_600_000,
            endTime: now + 7_200_000,
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game?.startTime, game?.betOpenTime, game?.betCloseTime, game?.endTime],
  )

  // Детальні групи (деталі гри)
  const gameInfo: DetailGroup[] = useMemo(() => {
    if (!game) return []
    return buildDetailGroups(game, finished, tz)
  }, [game, finished, tz])

  // Статистика для вигляду «Predictions»
  const stats = useMemo(() => {
    if (!game) return { reward: '—', ticketsTaken: '—', ticketsMine: '—', players: '—' }
    const taken = (game.takenByOthers?.length ?? 0) + (game.yourTickets?.length ?? 0)
    const mine = game.yourTickets?.length ?? 0
    return {
      reward: game.prize ?? '—',
      ticketsTaken: String(taken),
      ticketsMine: String(mine),
      // Кількість унікальних гравців, обчислена в маппері за множиною ownerId
      players: game.uniquePlayers !== undefined ? String(game.uniquePlayers) : '—',
    }
  }, [game])

  // Форматована поточна ціна BTC для плашки курсу
  const currentPriceStr = currentPrice
    ? centsToUsd(Math.round(currentPrice * 100))
    : '—'

  // Найближчі прогнози для «waiting»: лідер і ставка користувача з bets
  const closestPredictions = useMemo((): {
    leader: WaitBet
    mine: WaitBet
  } | null => {
    if (phase !== 'waiting' || bets.length === 0) return null

    const topBet = bets[0]
    const myBet = bets.find((b) => b.variant === 'mine')
    const fallback: WaitBet = {
      rank: 1,
      user: topBet.user,
      price: topBet.price,
      mine: topBet.variant === 'mine' || topBet.variant === 'win',
    }

    return {
      leader: fallback,
      mine: myBet
        ? { rank: myBet.rank, user: myBet.user, price: myBet.price, mine: true }
        : fallback,
    }
  }, [phase, bets])

  // «Edit»: повертає ціну в поле вводу та прибирає її з корзини
  const handleEditBooked = (price: number): void => {
    cart.remove(price)
    setSelectedPrice(price)
  }

  // «Clear all»: очищає корзину та згортає панель на графік
  const handleClearAll = (): void => {
    cart.clear()
    setCartOpen(false)
  }

  // Поки дані не завантажені — порожній контейнер без краша
  if (!ready || !game) {
    return <GameLayout header={<div />}>{null}</GameLayout>
  }

  // Фінальна ціна для шапки завершеної гри
  const headerFinalPrice = game.finalPrice ?? undefined

  // Виграшний пул для графіка
  const winningPool = game.prize ?? '—'

  return (
    <GameLayout
      header={
        <GameHeader
          name={game.name}
          endTime={game.endTime}
          viewMode={viewMode}
          onViewChange={setViewMode}
          mineOnly={mineOnly}
          onToggleMine={() => setMineOnly((prev) => !prev)}
          viewOptions={viewOptions}
          finished={finished}
          finalPrice={headerFinalPrice}
        />
      }
      footer={
        phase === 'active' ? (
          <BetPanel
            ticketPrice={game.ticketPrice}
            betCloseTime={game.betCloseTime}
            takenByOthers={game.takenByOthers}
            yourTickets={game.yourTickets}
            cart={cart}
            onOpenCart={() => setCartOpen(true)}
            presetPrice={selectedPrice}
            onPriceChange={setSelectedPrice}
            gameId={id}
          />
        ) : phase === 'waiting' && closestPredictions ? (
          <ClosestPredictions
            leader={closestPredictions.leader}
            mine={closestPredictions.mine}
            viewMode={viewMode}
            onChangeView={setViewMode}
          />
        ) : undefined
      }
    >
      {cartOpen ? (
        <CartPanel
          prices={cart.prices}
          ticketPrice={game.ticketPrice}
          onClose={() => setCartOpen(false)}
          onClearAll={handleClearAll}
          onEdit={handleEditBooked}
          onRemove={cart.remove}
        />
      ) : (
        <GameContent
          viewMode={viewMode}
          mineOnly={mineOnly}
          bets={bets}
          stats={stats}
          info={gameInfo}
          price={currentPriceStr}
          showCurrencyPlate={!finished}
          candles={candles}
          currentPrice={currentPrice}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          game={chartGame}
          chartBets={chartBets}
          winningPool={winningPool}
          onPriceSelect={setSelectedPrice}
          externalPrice={selectedPrice}
          interactive={phase === 'active'}
          sentinelRef={sentinelRef}
        />
      )}
    </GameLayout>
  )
}

export default GamePage
