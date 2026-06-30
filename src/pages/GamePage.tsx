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
import { useT } from '../i18n/useT'
import { useLocale } from '../i18n/locale'
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
 * @param locale — BCP-47 локаль для назв місяців (з useLocale()).
 * @param t  — функція перекладу з useT().
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
  locale: string,
  t: (key: string) => string,
): DetailGroup[] {
  const groups: DetailGroup[] = []

  // Група результату (лише для завершеної гри)
  if (finished) {
    const resultGroup: DetailGroup = []
    if (game.winnerNickname) {
      resultGroup.push({ label: t('game.detailWinner'), value: game.winnerNickname })
    }
    if (game.finalPrice) {
      resultGroup.push({ label: t('game.detailBtcPrice'), value: game.finalPrice })
    }
    if (game.winnerTicketPrice) {
      resultGroup.push({ label: t('game.detailWinnerTicket'), value: game.winnerTicketPrice })
    }
    if (resultGroup.length > 0) {
      groups.push(resultGroup)
    }
  }

  // Часова група — дати через formatInTz для консистентного TZ
  const timeGroup: DetailGroup = [
    {
      label: t('game.detailPredictionDateTime'),
      value: formatInTz(game.endTime, tz, locale),
    },
    {
      label: t('game.detailStopReceiving'),
      value: formatInTz(game.betCloseTime, tz, locale),
    },
    { label: t('game.detailOracleSource'), value: 'Binance' },
  ]
  groups.push(timeGroup)

  // Група призу
  const prizeGroup: DetailGroup = []
  if (game.prize) {
    prizeGroup.push({ label: t('game.detailReward'), value: game.prize })

    // Розподіл призового фонду між переможцем та організатором.
    // Формула відповідає старому фронтенду (frontend/src/hooks/useGameCalc.ts):
    //   organizerShare = pool * authorPercent / 100
    //   winnerShare = pool - organizerShare
    if (game.authorPercent !== undefined) {
      const pool = parseFloat(game.prize)
      if (Number.isFinite(pool)) {
        const organizerShare = pool * game.authorPercent / 100
        const winnerShare = pool - organizerShare
        prizeGroup.push({ label: t('game.detailWinnersShare'), value: `${winnerShare.toFixed(2)} TON` })
        prizeGroup.push({ label: t('game.detailOrganizersShare'), value: `${organizerShare.toFixed(2)} TON` })
      }
    }
  }
  if (game.ticketsTotal !== undefined) {
    prizeGroup.push({ label: t('game.detailNumberOfTickets'), value: String(game.ticketsTotal) })
  }
  prizeGroup.push({ label: t('game.detailTicketPrice'), value: `${game.ticketPrice} TON` })
  groups.push(prizeGroup)

  // Організатор
  if (game.organizer) {
    groups.push([{ label: t('game.detailOrganizer'), value: game.organizer }])
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
  const { t } = useT()
  const locale = useLocale()
  const myUserId = user?.id ?? null

  const { game, ready } = useGameLive(id, myUserId)

  const [searchParams] = useSearchParams()
  // Початковий вид: ?view=predictions відкриває список ставок
  const initialView: ViewMode = searchParams.get('view') === 'predictions' ? 'bets' : 'chart'
  const [rawViewMode, setViewMode] = useState<ViewMode>(initialView)
  const [timeframe, setTimeframe] = useState<Timeframe>('1m')
  // Фільтр «лише мої ставки» — керується кнопкою в шапці (вид Predictions)
  const [mineOnly, setMineOnly] = useState(false)
  // Режим сортування списку ставок: 'place' — за близькістю до ціни (дефолт), 'date' — за часом
  const [sortMode, setSortMode] = useState<'place' | 'date'>('place')

  const now = useNow()

  // Фаза гри обчислюється з реальних часів GameDetail
  const phase: GamePhase = game
    ? computePhase(game.betCloseTime, game.endTime, now)
    : 'active'

  const finished = phase === 'finished'

  // У завершеній грі вид «графік» недоступний
  const viewMode: ViewMode = finished && rawViewMode === 'chart' ? 'bets' : rawViewMode
  const viewOptions: ViewMode[] | undefined = finished ? ['bets', 'details'] : undefined

  // Повний набір ставок гри (усі тікети) — джерело для списку Predictions.
  // EMPTY_BETS — стабільна константа, щоб не давати Zustand нове посилання щорендер.
  const allBets = game?.allBets ?? EMPTY_BETS

  // Real-time тікети зі стора (game:ticket_added / ticket:created).
  const liveBets = useLiveStore((s) => s.ticketsByGame.get(id) ?? EMPTY_BETS)

  // Об'єднуємо повний набір із живими ставками (яких ще нема у грі до рефетчу),
  // дедуплікація за user+price. Сортування і перенумерація — нижче (після currentPrice).
  const mergedBets: Bet[] = useMemo(() => {
    if (liveBets.length === 0) return allBets
    const baseSet = new Set(allBets.map((b) => `${b.user}-${b.price}`))
    const newLive = liveBets.filter((b) => !baseSet.has(`${b.user}-${b.price}`))
    return [...newLive, ...allBets]
  }, [liveBets, allBets])

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

  // Детальні групи (деталі гри) — t передається як параметр, бо buildDetailGroups не хук
  const gameInfo: DetailGroup[] = useMemo(() => {
    if (!game) return []
    return buildDetailGroups(game, finished, tz, locale, t)
  }, [game, finished, tz, locale, t])

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

  // Референс-ціна (центи) для сортування за місцем: фінальна ціна оракула, якщо гра
  // фіналізована, інакше — поточний курс Binance. null — поки курс невідомий.
  const referenceCents: number | null =
    game?.finalPriceCents != null
      ? game.finalPriceCents
      : currentPrice != null
        ? Math.round(currentPrice * 100)
        : null

  // Відсортований список ставок із послідовною перенумерацією rank (1..N).
  //   place — за близькістю priceCents до референс-ціни (дефолт);
  //   date  — за часом створення (нові спереду).
  // Якщо референс-ціни ще немає, place відкочується на сортування за датою.
  const bets: Bet[] = useMemo(() => {
    const sorted = [...mergedBets]
    if (sortMode === 'place' && referenceCents != null) {
      sorted.sort(
        (a, b) =>
          Math.abs(a.priceCents - referenceCents) - Math.abs(b.priceCents - referenceCents),
      )
    } else {
      sorted.sort((a, b) => b.createdAt - a.createdAt)
    }
    return sorted.map((b, i) => ({ ...b, rank: i + 1 }))
  }, [mergedBets, sortMode, referenceCents])

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
          sortMode={sortMode}
          onToggleSort={() => setSortMode((m) => (m === 'place' ? 'date' : 'place'))}
        />
      )}
    </GameLayout>
  )
}

export default GamePage
