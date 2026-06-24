import type { FC } from 'react'
import { PixelCard } from '../ui/PixelCard'
import { PredictionButton } from '../ui/PredictionButton'
import { ConfettiBurst } from '../buy/ConfettiBurst'
import { ResultBetLine } from './ResultBetLine'
import { ResultStatusLine } from './ResultStatusLine'
import { useAuth } from '../../hooks/useAuth'
import type { ResultGame, ResultStatus } from '../../mocks/results'
import { formatInTz } from '../../utils/datetime'
import trophyImg from '../../assets/trophy.png'
import receiptIcon from '../../assets/icon-receipt.svg'
import btcIcon from '../../assets/icon-btc.svg'

/** Текст-підпис стану під трофеєм (processing — без тексту). */
const STATE_TEXT: Record<ResultStatus, string | null> = {
  won: 'You won',
  lost: 'You miss this one',
  cancelled: 'Nobody bought a ticket',
  processing: null,
}

/** Золотий трофей для виграшних/активних станів, срібний — для програшних. */
const isGoldTrophy = (status: ResultStatus): boolean =>
  status === 'won' || status === 'processing'

/**
 * Картка завершеної гри (Results): шапка, трофей (золото/срібло, конфеті для won),
 * текст стану, сума, рядок фінальних даних, короткий рейтинг ставок, кнопка
 * «All tickets» та підсумковий статус. Стан `cancelled` показує лише трофей,
 * текст і суму «0.0 TON» без ставок/кнопки.
 */
/** Базовий URL TON-explorer (тестнет — гра в розробці на testnet). */
const EXPLORER_URL = 'https://testnet.tonviewer.com'

export const ResultCard: FC<ResultGame> = ({
  id,
  title,
  author,
  contractAddress,
  status,
  reward,
  finishedAt,
  finalPrice,
  leader,
  mine,
  deviationPercent,
}) => {
  const { tz } = useAuth()
  const stateText = STATE_TEXT[status]
  const isGold = isGoldTrophy(status)
  const isCancelled = status === 'cancelled'
  const isWon = status === 'won'

  return (
    <PixelCard className="mx-7" contentClassName="items-center gap-4 px-7 py-4">
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-[3px]">
          <h2 className="font-body text-[18px] font-bold text-text-primary">{title}</h2>
          <p className="font-mono text-[15px] text-text-primary">{author}</p>
        </div>
        <a
          href={`${EXPLORER_URL}/${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View smart contract"
          className="relative flex h-9 w-7 shrink-0 items-center justify-center bg-[#ef9723] outline-none"
        >
          <span className="absolute inset-y-1 -inset-x-1 bg-[#ef9723]" aria-hidden="true" />
          <img src={receiptIcon} alt="" aria-hidden="true" className="relative z-10 h-4 w-auto" />
        </a>
      </div>

      <div className="relative flex flex-col items-center gap-2">
        <div className="relative">
          {isWon ? <ConfettiBurst /> : null}
          <img
            src={trophyImg}
            alt=""
            aria-hidden="true"
            className={`h-16 w-16 object-contain ${isGold ? '' : 'grayscale'}`}
          />
        </div>
        {stateText ? (
          <p className="font-body text-[15px] font-bold text-text-primary">{stateText}</p>
        ) : null}
        <span className="font-mono text-[28px] font-bold text-text-primary">{reward}</span>
      </div>

      {!isCancelled ? (
        <>
          <div className="flex w-full items-center justify-between">
            <span className="font-mono text-[15px] font-bold text-text-primary">
              {formatInTz(finishedAt, tz)}
            </span>
            {finalPrice ? (
              <span className="flex items-center gap-2">
                <img src={btcIcon} alt="" aria-hidden="true" className="h-4 w-4" />
                <span className="font-mono text-[15px] font-bold text-text-primary">{finalPrice}</span>
              </span>
            ) : null}
          </div>

          {/* Суцільна лінія, що відділяє фінальні дані від рейтингу ставок. */}
          <div className="w-full border-t border-border-solid" aria-hidden="true" />

          <div className="flex w-full flex-col gap-4">
            {isWon ? (
              <>
                {mine ? <ResultBetLine bet={mine} /> : null}
                {deviationPercent !== undefined ? (
                  <p className="text-center font-body text-[13px] text-text-secondary">
                    Your predicted price is{' '}
                    <span className="font-bold text-text-focus">{deviationPercent}%</span> away from
                    the current market value
                  </p>
                ) : null}
              </>
            ) : (
              <>
                {leader ? <ResultBetLine bet={leader} /> : null}
                <div
                  className="w-full border-t border-dashed border-border-dashed"
                  aria-hidden="true"
                />
                {mine ? <ResultBetLine bet={mine} /> : null}
              </>
            )}
          </div>

          <PredictionButton
            to={`/game/${id}?view=predictions`}
            label="All tickets"
            variant="inverse"
          />
        </>
      ) : null}

      <ResultStatusLine status={status} />
    </PixelCard>
  )
}
