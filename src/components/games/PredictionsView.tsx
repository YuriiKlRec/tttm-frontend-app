import { useMemo, type FC } from 'react'
import type { Bet } from '../../types/game'
import { PredictionStats } from './PredictionStats'
import { BetLine } from './BetLine'
import { CurrencyPricePlate } from './CurrencyPricePlate'
import { useT } from '../../i18n/useT'
import sortIcon from '../../assets/icon-sort.svg'

/**
 * Прапорець видимості UI-перемикача сортування — вимкнено за брифом round11A
 * (Figma 1360:11439 не показує іконку сортування). Логіка сортування лишається
 * робочою, вимкнено лише рендер кнопки.
 */
const SHOW_SORT_TOGGLE = false

/** Статистика гри для верхньої панелі. */
interface PredictionsStatsData {
  /** Призовий фонд. */
  reward: string
  /** Усі зайняті квитки. */
  ticketsTaken: string
  /** Квитки користувача. */
  ticketsMine: string
  /** Кількість гравців. */
  players: string
}

/** Пропси вигляду «Predictions». */
interface PredictionsViewProps {
  /** Список ставок. */
  bets: Bet[]
  /** Статистика гри. */
  stats: PredictionsStatsData
  /** Поточна ціна для плашки курсу. */
  price: string
  /** Показувати лише власні ставки (variant === 'mine'). */
  mineOnly: boolean
  /** Показувати плашку поточного курсу (приховано для завершеної гри). */
  showPrice?: boolean
  /** Режим сортування: 'place' — за місцем (близькість до ціни), 'date' — за часом. */
  sortMode: 'place' | 'date'
  /** Перемикач режиму сортування. */
  onToggleSort: () => void
}

/**
 * Вигляд «Predictions»: фіксований верх (статистика + заголовок зі стрілками
 * сортування), скрол-список ставок та прикріплена внизу плашка курсу.
 * Фільтр «лише мої» керується кнопкою в шапці через проп `mineOnly`.
 */
export const PredictionsView: FC<PredictionsViewProps> = ({
  bets,
  stats,
  price,
  mineOnly,
  showPrice = true,
  sortMode,
  onToggleSort,
}) => {
  const { t } = useT()

  // «Лише мої»: поле mine незалежне від variant (win лишає лише корону),
  // тож моя виграшна ставка (variant='win', mine=true) не випадає з фільтра.
  const visibleBets = useMemo(
    () => (mineOnly ? bets.filter((bet) => bet.mine) : bets),
    [bets, mineOnly],
  )

  return (
    <div className="relative flex h-full flex-col">
      <div className="bg-background">
        <PredictionStats {...stats} />

        <div className="flex items-center justify-between px-6">
          <h2 className="font-body text-[15px] font-bold text-text-primary">
            {t('predictions.ticketsHeader')}
          </h2>
          {/*
           * Перемикач сортування (за місцем ↔ за датою) — прихований поки що
           * за макетом (Figma 1360:11439 не містить іконки сортування біля
           * заголовка «Tickets»). Логіка сортування (sortMode/onToggleSort)
           * лишається робочою на рівні GamePage — прибрано лише UI-контрол.
           */}
          {SHOW_SORT_TOGGLE ? (
            <button
              type="button"
              aria-label={sortMode === 'place' ? t('predictions.sortByDateAria') : t('predictions.sortByPlaceAria')}
              aria-pressed={sortMode === 'date'}
              onClick={onToggleSort}
              className="flex h-7 w-7 items-center justify-center transition-opacity active:opacity-60"
            >
              <img src={sortIcon} alt="" aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 h-px w-full bg-[rgba(255,255,255,0.25)]" aria-hidden="true" />
      </div>

      <div className="relative flex-1 overflow-y-auto scrollbar-hide">
        <ul className="space-y-5 px-6 pt-5 pb-12">
          {visibleBets.map((bet) => (
            <li key={`${bet.rank}-${bet.user}`}>
              <BetLine
                rank={bet.rank}
                user={bet.user}
                price={bet.price}
                variant={bet.variant}
                mine={bet.mine}
              />
            </li>
          ))}
        </ul>
      </div>

      {showPrice ? (
        <div className="absolute inset-x-0 bottom-2 mx-3">
          <CurrencyPricePlate price={price} />
        </div>
      ) : null}
    </div>
  )
}
