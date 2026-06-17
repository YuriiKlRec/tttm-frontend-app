import type { FC } from 'react'

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
    { start: 0, length: elapsed, color: '#adadad' },
    { start: elapsed, length: Math.max(0, betClose - elapsed), color: '#ef9723' },
    { start: whiteStart, length: 1 - whiteStart, color: '#ffffff' },
  ]
}

/**
 * Кільце-таймлайн 200x200: три кольорові дуги (пройдено/ставки/залишок),
 * старт зверху, напрямок проти годинникової стрілки. По центру — зворотній
 * відлік до кінця гри та дата кінця.
 */
export const Timer: FC<TimerProps> = ({ elapsedFrac, betCloseFrac, time, date }) => {
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
        <span className="font-mono text-[28px] font-bold text-text-primary">{time}</span>
        <span className="font-mono text-[18px] text-text-secondary">{date}</span>
      </div>
    </div>
  )
}
