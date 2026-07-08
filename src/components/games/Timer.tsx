import type { FC } from 'react'
import trophyIcon from '../../assets/icon-trophy.svg'
import btcIcon from '../../assets/icon-btc.svg'

/** Пропси таймера-таймлайну зворотного відліку. */
interface TimerProps {
  /** Частка пройденого часу (сірий сегмент), 0..1. */
  elapsedFrac: number
  /** Частка до закриття прийому ставок (межа оранжевого сегмента), 0..1. */
  betCloseFrac: number
  /** Великий час по центру — зворотній відлік до кінця (напр. "10:03:01"). */
  time: string
  /** Дата/час кінця гри під часом (напр. "Jan 1, 10:00"). */
  date: string
  /** Винагорода — якщо задано, показується блоком «🏆 Reward / X» над часом. */
  reward?: string
  /**
   * Торгова пара передбачення (напр. "BTC/USDT") — кругла підказка над датою/часом.
   * Задається лише у картці списку ігор (GameCard); за замовчуванням не показується.
   */
  pair?: string
}

const SIZE = 200
const STROKE = 5
const RADIUS = SIZE / 2 - STROKE
const C = 2 * Math.PI * RADIUS

/** Дескриптор одного сегмента-дуги кільця. */
interface Segment {
  start: number
  length: number
  color: string
}

/**
 * Будує три сегменти таймлайну від старту (зверху) проти годинникової стрілки:
 * сірий (пройдено) → оранжевий (ставки відкриті) → білий (залишок після закриття).
 */
const buildSegments = (elapsed: number, betClose: number): Segment[] => {
  const whiteStart = Math.max(elapsed, betClose)
  return [
    // пройдений час (основне коло) — темно-сірий; коли час вичерпано, усе коло таке
    { start: 0, length: elapsed, color: '#474747' },
    { start: elapsed, length: Math.max(0, betClose - elapsed), color: '#ef9723' },
    { start: whiteStart, length: 1 - whiteStart, color: '#ffffff' },
  ]
}

/**
 * Кільце-таймлайн 200x200: три кольорові дуги (пройдено/ставки/залишок),
 * старт зверху, напрямок проти годинникової стрілки. По центру — зворотній
 * відлік до кінця гри та дата кінця.
 */
export const Timer: FC<TimerProps> = ({ elapsedFrac, betCloseFrac, time, date, reward, pair }) => {
  const segments = buildSegments(elapsedFrac, betCloseFrac)

  return (
    <div className="relative h-[200px] w-[200px]">
      {/* rotate(-90) ставить 0 угорі; scale(-1,1) дзеркалить напрямок на CCW */}
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full"
        aria-hidden="true"
      >
        <g transform={`translate(${SIZE}, 0) scale(-1, 1) rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segments.map((seg) =>
            seg.length > 0 ? (
              <circle
                key={seg.color}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                strokeDasharray={`${seg.length * C} ${C}`}
                strokeDashoffset={-seg.start * C}
              />
            ) : null,
          )}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6px]">
        {pair ? (
          // Список ігор (GameCard): підказка валютної пари над датою/часом, дата — акцент.
          <div className="flex flex-col items-center gap-[20px]">
            <span className="flex items-center gap-2">
              <img src={btcIcon} alt="" aria-hidden="true" className="h-6 w-6" />
              <span className="font-mono text-[16px] font-bold text-text-primary">{pair}</span>
            </span>
            <span className="flex flex-col items-center gap-[6px]">
              <span className="font-mono text-[22px] font-bold text-text-primary">{date}</span>
              <span className="font-mono text-[18px] font-bold text-text-secondary">{time}</span>
            </span>
          </div>
        ) : (
          <>
            {reward ? (
              <span className="mb-1 flex flex-col items-center gap-0.5">
                <span className="flex items-center gap-1.5">
                  <img src={trophyIcon} alt="" aria-hidden="true" className="h-4 w-4" />
                  <span className="font-mono text-[13px] text-text-secondary">Reward</span>
                </span>
                <span className="font-mono text-[16px] font-bold text-text-primary">{reward}</span>
              </span>
            ) : null}
            {/* З винагородою (Wait) центр компактніший: час 18 / дата 15; інакше 28 / 18. */}
            <span
              className={`font-mono font-bold text-text-primary ${reward ? 'text-[18px]' : 'text-[28px]'}`}
            >
              {time}
            </span>
            <span className={`font-mono text-text-secondary ${reward ? 'text-[15px]' : 'text-[18px]'}`}>
              {date}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
