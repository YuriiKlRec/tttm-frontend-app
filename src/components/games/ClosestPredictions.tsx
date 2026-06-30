import type { FC } from 'react'
import { WaitBetLine } from './WaitBetLine'
import { PredictionButton } from '../ui/PredictionButton'
import { useT } from '../../i18n/useT'
import type { WaitBet } from '../../types/wait'
import type { ViewMode } from '../../types/game'
import moonImg from '../../assets/moon.png'

/** Пропси блоку найближчих прогнозів (футер завершеної гри). */
interface ClosestPredictionsProps {
  /** Переможець (ранг 1). */
  leader: WaitBet
  /** Ставка поточного користувача. */
  mine: WaitBet
  /** Відхилення своєї ціни від ринку, % (для стану лідера). */
  deviationPercent?: number
  /** Поточний вид центральної області. */
  viewMode: ViewMode
  /** Перемикання виду (кнопка Show all / Show chart). */
  onChangeView: (value: ViewMode) => void
}

/**
 * Футер завершеної гри: замість форми ставки — короткий рейтинг найближчих
 * прогнозів. Якщо користувач лідирує — лише його ставка + відхилення від ринку,
 * інакше переможець + власна ставка. Кнопка веде до прихованого зараз виду
 * (зі списку — на графік, інакше — на повний список).
 */
export const ClosestPredictions: FC<ClosestPredictionsProps> = ({
  leader,
  mine,
  deviationPercent,
  viewMode,
  onChangeView,
}) => {
  const { t } = useT()
  const isLeading = mine.rank === 1
  const onList = viewMode === 'bets'
  const ctaLabel = onList ? t('game.showChart') : t('game.showAll')

  // Sentinel-підхід: отримуємо шаблон без інтерполяції і розбиваємо по {{percent}}
  const deviationTpl = t('game.yourPredictedPrice')
  const [devBefore, devAfter] = deviationTpl.split('{{percent}}')

  return (
    <footer
      className="relative z-20 flex w-full flex-col gap-4 overflow-hidden border-t border-border-dashed bg-surface px-7 pt-4"
      style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 16px)' }}
    >
      <img
        src={moonImg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -top-2 right-4 h-16 w-16 opacity-60"
      />

      <p className="font-mono text-[15px] font-bold text-text-secondary">{t('game.closestPredictions')}</p>

      <div className="flex flex-col gap-4">
        {isLeading ? (
          <>
            <WaitBetLine bet={mine} />
            {deviationPercent !== undefined ? (
              <p className="font-body text-[13px] text-text-secondary">
                {devBefore}<span className="font-bold text-text-focus">{deviationPercent}%</span>{devAfter}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <WaitBetLine bet={leader} />
            <div
              className="w-full border-t border-dashed border-border-dashed"
              aria-hidden="true"
            />
            <WaitBetLine bet={mine} />
          </>
        )}
      </div>

      <PredictionButton
        label={ctaLabel}
        variant="inverse"
        onClick={() => onChangeView(onList ? 'chart' : 'bets')}
      />
    </footer>
  )
}
