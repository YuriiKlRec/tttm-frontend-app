import type { Candle } from '../../../services/binance'

/** Геймовий контекст для відображення колонок та маркерів на таймлайні. */
export interface ChartGame {
  /** Початок гри (epoch ms). */
  startTime: number
  /** Час відкриття прийому ставок (epoch ms) — ліва межа жовтої колонки. */
  betOpenTime: number
  /** Час закриття прийому ставок (epoch ms). */
  betCloseTime: number
  /** Кінець гри (epoch ms). */
  endTime: number
}

/** Одна попередня ставка для маркера на правій межі. */
export interface ChartBet {
  /** Спрогнозована ціна. */
  price: number
  /** Чи це ставка поточного користувача (оранжева), інакше — чужа (червона). */
  mine: boolean
  /** Заброньована, але ще не оплачена ставка — маркер на білому фоні. */
  booked?: boolean
}

/** Режим відображення графіка. */
export type ChartMode = 'line' | 'candles'

/** Стан Y-контролера за близькістю до ставок. */
export type ControllerState = 'default' | 'mine' | 'others'

/** Поріг магніту контролера до своєї ставки (px по Y). */
export const CONTROLLER_SNAP_PX = 7

/** Ширина правої осі цін (px). */
export const AXIS_WIDTH = 76

/** Висота зони під легендою знизу (px). */
export const LEGEND_HEIGHT = 68

/** Відступ зверху для міток часу (px). */
export const TOP_PADDING = 22

/** Частка ширини тіла графіка, відведена під майбутню зону (гру) справа. */
export const FUTURE_RATIO = 0.32

/** Поточний видимий діапазон цін по осі Y. */
export interface PriceRange {
  /** Нижня межа діапазону. */
  min: number
  /** Верхня межа діапазону. */
  max: number
}

/** Повний стан, потрібний для чистого малювання графіка. */
export interface ChartDrawState {
  /** CSS-ширина області (px). */
  width: number
  /** CSS-висота області (px). */
  height: number
  /** Свічки історії. */
  candles: Candle[]
  /** Кількість видимих (останніх) свічок — горизонтальний зум. */
  visibleCount: number
  /** Жива ціна або null. */
  currentPrice: number | null
  /** Видимий діапазон цін. */
  priceRange: PriceRange
  /** Режим line/candles. */
  mode: ChartMode
  /** Геймовий контекст. */
  game: ChartGame
  /** Попередні ставки. */
  bets: ChartBet[]
  /** Ціна Y-контролера (вибрана користувачем). */
  selectedPrice: number
  /** Стан контролера (default/mine/others) — для кольору лінії. */
  controllerState: ControllerState
  /** Завантажені іконки (готові до малювання) або null. */
  icons: ChartIcons | null
}

/** Передзавантажені растрові іконки для canvas. */
export interface ChartIcons {
  /** BTC-іконка для лейбла поточної ціни. */
  btc: HTMLImageElement | null
  /** Своя ставка (оранжева). */
  ticket: HTMLImageElement | null
  /** Чужа ставка (червона). */
  ticketRed: HTMLImageElement | null
  /** Заброньована (неоплачена) ставка — біла. */
  ticketWhite: HTMLImageElement | null
}

/**
 * Обчислює межі тіла графіка (без правої осі та легенди).
 */
export const getPlotRect = (
  width: number,
  height: number,
): { left: number; right: number; top: number; bottom: number } => ({
  left: 0,
  right: width - AXIS_WIDTH,
  top: TOP_PADDING,
  bottom: height - LEGEND_HEIGHT,
})

/** Конвертує ціну в Y-піксель у межах тіла графіка. */
export const priceToY = (
  price: number,
  range: PriceRange,
  top: number,
  bottom: number,
): number => {
  const span = range.max - range.min || 1
  const ratio = (price - range.min) / span
  return bottom - ratio * (bottom - top)
}

/** Конвертує Y-піксель назад у ціну. */
export const yToPrice = (
  y: number,
  range: PriceRange,
  top: number,
  bottom: number,
): number => {
  const span = range.max - range.min || 1
  const ratio = (bottom - y) / (bottom - top || 1)
  return range.min + ratio * span
}

/**
 * Обчислює початковий діапазон цін за свічками з невеликим запасом.
 * Якщо свічок немає — повертає безпечний дефолт навколо ціни/нуля.
 */
export const computeInitialRange = (
  candles: Candle[],
  currentPrice: number | null,
): PriceRange => {
  if (candles.length === 0) {
    const base = currentPrice ?? 100
    return { min: base * 0.98, max: base * 1.02 }
  }
  let lo = candles[0].low
  let hi = candles[0].high
  for (const c of candles) {
    if (c.low < lo) {
      lo = c.low
    }
    if (c.high > hi) {
      hi = c.high
    }
  }
  if (currentPrice !== null) {
    lo = Math.min(lo, currentPrice)
    hi = Math.max(hi, currentPrice)
  }
  const pad = (hi - lo) * 0.08 || hi * 0.01 || 1
  return { min: lo - pad, max: hi + pad }
}

/**
 * Стан контролера: над своєю ставкою (в межах магніту по Y) — 'mine';
 * над чужою — 'others' ЛИШЕ при 100% збігу ціни (до цента); інакше 'default'.
 * Свої мають пріоритет.
 */
export const resolveControllerState = (
  price: number,
  bets: ChartBet[],
  range: PriceRange,
  top: number,
  bottom: number,
): ControllerState => {
  const cy = priceToY(price, range, top, bottom)
  let others: ControllerState = 'default'
  for (const bet of bets) {
    if (bet.mine) {
      const by = priceToY(bet.price, range, top, bottom)
      if (Math.abs(by - cy) <= CONTROLLER_SNAP_PX) {
        return 'mine'
      }
    } else if (Math.abs(price - bet.price) < 0.005) {
      others = 'others'
    }
  }
  return others
}

/** Найближча ціна СВОЄЇ ставки в межах магніту (px) або null. */
export const snapToOwnBet = (
  y: number,
  bets: ChartBet[],
  range: PriceRange,
  top: number,
  bottom: number,
): number | null => {
  let best = CONTROLLER_SNAP_PX
  let snapped: number | null = null
  for (const bet of bets) {
    if (!bet.mine) {
      continue
    }
    const by = priceToY(bet.price, range, top, bottom)
    const dy = Math.abs(by - y)
    if (dy <= best) {
      best = dy
      snapped = bet.price
    }
  }
  return snapped
}
