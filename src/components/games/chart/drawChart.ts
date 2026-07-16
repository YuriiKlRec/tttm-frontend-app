import {
  AXIS_WIDTH,
  getPlotRect,
  priceToY,
  resolveControllerPosition,
  type ChartDrawState,
  type PriceRange,
} from './chartTypes'
import { formatDateTime } from '../../../utils/time'

/** Палітра графіка (вирівняна з темою проєкту). Canvas — без CSS-змінних, тому дублюємо hex. */
const COLORS = {
  bg: '#080603', // = --color-background (фон канви)
  grid: 'rgba(255,255,255,0.1)',
  line: '#ef9723',
  up: '#54b566',
  down: '#e5484d',
  textPrimary: '#ffffff',
  textSecondary: '#adadad',
  focus: '#ef9723',
  currentLabelBg: '#080603', // = --color-background (плашка ціни того ж стилю, що CurrencyPricePlate)
  currentDash: 'rgba(255,153,0,0.25)',
  betting: 'rgba(255,153,0,0.15)',
  passive: 'rgba(255,255,255,0.15)',
  bound: 'rgba(255,255,255,0.4)',
  controller: '#ffffff',
} as const

const MONO = "11px 'Anonymous Pro', monospace"

/** Форматує ціну з роздільниками тисяч (для осі/лейбла). */
const fmtPrice = (value: number): string =>
  value.toLocaleString('en-US', { maximumFractionDigits: value < 1000 ? 2 : 0 })

/** Обирає «круглий» крок сітки для діапазону. */
const niceStep = (span: number, target: number): number => {
  const raw = span / target
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  let step = 1
  if (norm >= 5) {
    step = 5
  } else if (norm >= 2) {
    step = 2
  }
  return step * mag
}

/** Малює горизонтальну сітку та праву вісь цін. */
const drawPriceAxis = (
  ctx: CanvasRenderingContext2D,
  range: PriceRange,
  top: number,
  bottom: number,
  right: number,
  width: number,
): void => {
  const step = niceStep(range.max - range.min, 5)
  const start = Math.ceil(range.min / step) * step

  ctx.font = MONO
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  for (let price = start; price <= range.max; price += step) {
    const y = priceToY(price, range, top, bottom)
    if (y < top || y > bottom) {
      continue
    }
    ctx.strokeStyle = COLORS.grid
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, Math.round(y) + 0.5)
    ctx.lineTo(right, Math.round(y) + 0.5)
    ctx.stroke()

    ctx.fillStyle = COLORS.textPrimary
    ctx.fillText(fmtPrice(price), right + 8, y)
  }

  // Верх/низ діапазону — приглушені
  ctx.fillStyle = COLORS.textSecondary
  ctx.textBaseline = 'top'
  ctx.fillText(fmtPrice(range.max), right + 8, top + 2)
  ctx.textBaseline = 'bottom'
  ctx.fillText(fmtPrice(range.min), right + 8, bottom - 2)

  // Розділювач осі — суцільна полоса, від самого верху (межа з шапкою) до низу.
  ctx.strokeStyle = COLORS.bound
  ctx.beginPath()
  ctx.moveTo(right + 0.5, 0)
  ctx.lineTo(right + 0.5, bottom)
  ctx.stroke()
  // (width лишаємо в сигнатурі для майбутніх потреб)
  void width
}

/**
 * Малює верхню й нижню межові лінії зони графіка (A4) — той самий стиль,
 * що вертикальний розділювач правої осі (COLORS.bound), для візуального
 * відділення тіла графіка від хедера (мітки часу) і легенди знизу.
 */
const drawPlotBounds = (
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  top: number,
  bottom: number,
): void => {
  ctx.strokeStyle = COLORS.bound
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(left, Math.round(top) + 0.5)
  ctx.lineTo(right, Math.round(top) + 0.5)
  ctx.moveTo(left, Math.round(bottom) + 0.5)
  ctx.lineTo(right, Math.round(bottom) + 0.5)
  ctx.stroke()
}

/** Тип функції мапінгу реального часу (epoch ms) у X-піксель. */
type TimeToX = (t: number) => number


/** Малює мітки часу зверху. */
const drawTimeLabels = (
  ctx: CanvasRenderingContext2D,
  state: ChartDrawState,
  leftTime: number,
  betCloseX: number,
): void => {
  ctx.font = MONO
  ctx.fillStyle = COLORS.textSecondary
  ctx.textBaseline = 'top'

  // Зліва — перша видима точка часу (ліва межа вікна).
  ctx.textAlign = 'left'
  ctx.fillText(`← ${formatDateTime(leftTime, state.locale)}`, 4, 4)

  // Мітка на межі betClose.
  ctx.textAlign = 'center'
  ctx.fillText(formatDateTime(state.game.betCloseTime, state.locale), betCloseX, 4)
}

/** Малює лінію ціни (line mode) за реальним часом свічок. */
const drawLine = (
  ctx: CanvasRenderingContext2D,
  state: ChartDrawState,
  timeToX: TimeToX,
  leftTime: number,
  now: number,
  top: number,
  bottom: number,
): void => {
  const { candles, priceRange } = state
  // Лише видимі точки історії (від leftTime до now).
  const visible = candles.filter((c) => c.time >= leftTime && c.time <= now)
  if (visible.length < 2) {
    return
  }

  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  visible.forEach((c, i) => {
    const x = timeToX(c.time)
    const y = priceToY(c.close, priceRange, top, bottom)
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  // Продовжуємо лінію від останньої свічки до живої ціни на поточному моменті (nowX),
  // щоб крива чітко доходила до now всередині жовтої колонки.
  if (state.currentPrice !== null) {
    ctx.lineTo(timeToX(now), priceToY(state.currentPrice, priceRange, top, bottom))
  }
  ctx.stroke()
}

/**
 * Кліпає малювання кривої/свічок межами тіла графіка (A6): без кліпу крива
 * могла виїжджати по вертикалі на сусідні блоки (хедер міток часу зверху,
 * легенду знизу) при екстремальних значеннях поза видимим priceRange.
 */
const withPlotClip = (
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  top: number,
  bottom: number,
  draw: () => void,
): void => {
  ctx.save()
  ctx.beginPath()
  ctx.rect(left, top, right - left, bottom - top)
  ctx.clip()
  draw()
  ctx.restore()
}

/** Малює свічки (candles mode) за реальним часом свічок. */
const drawCandles = (
  ctx: CanvasRenderingContext2D,
  state: ChartDrawState,
  timeToX: TimeToX,
  leftTime: number,
  now: number,
  interval: number,
  top: number,
  bottom: number,
): void => {
  const { candles, priceRange } = state
  const visible = candles.filter((c) => c.time >= leftTime && c.time <= now)
  if (visible.length === 0) {
    return
  }
  // Ширина слота = піксельний розмір одного інтервалу часу.
  const slot = timeToX(leftTime + interval) - timeToX(leftTime)
  const bodyW = Math.max(1, Math.min(slot * 0.6, 12))

  visible.forEach((c) => {
    const cx = timeToX(c.time) + slot / 2
    const up = c.close >= c.open
    const color = up ? COLORS.up : COLORS.down
    const yHigh = priceToY(c.high, priceRange, top, bottom)
    const yLow = priceToY(c.low, priceRange, top, bottom)
    const yOpen = priceToY(c.open, priceRange, top, bottom)
    const yClose = priceToY(c.close, priceRange, top, bottom)

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 1
    // Гніт
    ctx.beginPath()
    ctx.moveTo(Math.round(cx) + 0.5, yHigh)
    ctx.lineTo(Math.round(cx) + 0.5, yLow)
    ctx.stroke()
    // Тіло
    const bodyTop = Math.min(yOpen, yClose)
    const bodyH = Math.max(1, Math.abs(yClose - yOpen))
    ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH)
  })
}

/** Малює вертикальну штрихову лінію межі. */
const dashedVertical = (
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
): void => {
  ctx.save()
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = COLORS.bound
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(Math.round(x) + 0.5, top)
  ctx.lineTo(Math.round(x) + 0.5, bottom)
  ctx.stroke()
  ctx.restore()
}

/** Малює тонку штрихову вертикаль (для поточного моменту now). */
const dashedVerticalThin = (
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
): void => {
  ctx.save()
  ctx.setLineDash([3, 5])
  ctx.strokeStyle = COLORS.currentDash
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(Math.round(x) + 0.5, top)
  ctx.lineTo(Math.round(x) + 0.5, bottom)
  ctx.stroke()
  ctx.restore()
}

/**
 * Малює колонки гри:
 * - betting (жовта) — період прийому ставок [betOpenX .. betCloseX];
 * - passive (сіра) — очікування фіналізації [betCloseX .. endX].
 * now перебуває всередині жовтої колонки, тож крива історії лягає на неї.
 */
const drawGameColumns = (
  ctx: CanvasRenderingContext2D,
  betOpenX: number,
  betCloseX: number,
  endX: number,
  nowX: number,
  right: number,
  top: number,
  bottom: number,
): void => {
  ctx.fillStyle = COLORS.betting
  ctx.fillRect(betOpenX, top, betCloseX - betOpenX, bottom - top)
  ctx.fillStyle = COLORS.passive
  ctx.fillRect(betCloseX, top, endX - betCloseX, bottom - top)

  dashedVertical(ctx, betOpenX, top, bottom)
  dashedVertical(ctx, betCloseX, top, bottom)
  // Маркер кінця штриховою лише коли він усередині плоту (гра завершилась);
  // на правому краю його роль виконує суцільний розділювач осі.
  if (endX < right - 1) {
    dashedVertical(ctx, endX, top, bottom)
  }
  // Поточний момент — тонша лінія всередині жовтої колонки.
  if (nowX > betOpenX && nowX < betCloseX) {
    dashedVerticalThin(ctx, nowX, top, bottom)
  }
}

/** Малює лейбл поточної ціни (штрихова лінія + бокс зліва + BTC-іконка). */
const drawCurrentPrice = (
  ctx: CanvasRenderingContext2D,
  state: ChartDrawState,
  left: number,
  right: number,
  top: number,
  bottom: number,
): void => {
  const { currentPrice, priceRange, icons } = state
  if (currentPrice === null) {
    return
  }
  const y = priceToY(currentPrice, priceRange, top, bottom)
  if (y < top || y > bottom) {
    return
  }

  ctx.save()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = COLORS.focus
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(left, Math.round(y) + 0.5)
  ctx.lineTo(right, Math.round(y) + 0.5)
  ctx.stroke()
  ctx.restore()

  const label = fmtPrice(currentPrice)
  ctx.font = MONO
  const padX = 6
  const iconSize = 16
  const textW = ctx.measureText(label).width
  const boxH = 18
  const boxX = left + iconSize + 6
  const boxY = y - boxH / 2
  const boxW = textW + padX * 2

  // BTC-іконка ліворуч від боксу
  if (icons?.btc) {
    ctx.drawImage(icons.btc, left + 2, y - iconSize / 2, iconSize, iconSize)
  }

  ctx.fillStyle = COLORS.currentLabelBg
  ctx.fillRect(boxX, boxY, boxW, boxH)
  ctx.save()
  ctx.setLineDash([3, 2])
  ctx.strokeStyle = COLORS.currentDash
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW, boxH)
  ctx.restore()

  ctx.fillStyle = COLORS.focus
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, boxX + padX, y)
}

/** Малює маркери ставок на правому краю плоту (межа з віссю цін). */
const drawBetMarkers = (
  ctx: CanvasRenderingContext2D,
  state: ChartDrawState,
  right: number,
  top: number,
  bottom: number,
): void => {
  const { bets, priceRange, icons } = state
  const size = 12
  for (const bet of bets) {
    const y = priceToY(bet.price, priceRange, top, bottom)
    if (y < top || y > bottom) {
      continue
    }
    // booked (неоплачена) — біла іконка; своя — оранжева; чужа — червона.
    const icon = bet.booked ? icons?.ticketWhite : bet.mine ? icons?.ticket : icons?.ticketRed
    if (icon) {
      ctx.drawImage(icon, right - size / 2, y - size / 2, size, size)
    } else {
      ctx.fillStyle = bet.booked ? COLORS.controller : bet.mine ? COLORS.focus : COLORS.down
      ctx.beginPath()
      ctx.arc(right, y, size / 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** Малює білий Y-контролер (лінія + glow) — бокс значення малює DOM-оверлей.
 * Не показуємо, доки контролер не поставлений тапом (A1). Якщо ціна поза
 * видимим діапазоном — лінія прилипає до верху/низу зони (A8) з невеликим
 * трикутником-індикатором напрямку. */
const drawController = (
  ctx: CanvasRenderingContext2D,
  state: ChartDrawState,
  left: number,
  right: number,
  top: number,
  bottom: number,
): void => {
  if (!state.controllerVisible) {
    return
  }
  const { y, edge } = resolveControllerPosition(state.selectedPrice, state.priceRange, top, bottom)
  // Колір за станом: своя ставка — оранжевий, чужа — червоний, інакше білий.
  const color =
    state.controllerState === 'mine'
      ? COLORS.focus
      : state.controllerState === 'others'
        ? COLORS.down
        : COLORS.controller
  ctx.save()
  ctx.shadowColor = color === COLORS.controller ? 'rgba(255,255,255,0.6)' : color
  ctx.shadowBlur = 6
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  // Лінію тягнемо до правого краю canvas (під бокс значення на осі), без розриву.
  ctx.moveTo(left, Math.round(y) + 0.5)
  ctx.lineTo(state.width, Math.round(y) + 0.5)
  ctx.stroke()

  // Прилипання до краю (A8): трикутник-індикатор напрямку біля лівого краю лінії
  // (▲ ціна вища за видимий діапазон, ▼ нижча).
  if (edge !== 'in') {
    const up = edge === 'above'
    const cx = left + 10
    const cy = up ? y - 7 : y + 7
    const tipY = up ? cy - 5 : cy + 5
    const baseY = up ? cy + 5 : cy - 5
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(cx - 5, baseY)
    ctx.lineTo(cx + 5, baseY)
    ctx.lineTo(cx, tipY)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  void right
}

/**
 * Чисте малювання всього графіка у вже масштабований під DPR контекст.
 * Координати — у CSS-пікселях (масштабування виконує виклик через ctx.scale).
 */
export const drawChart = (ctx: CanvasRenderingContext2D, state: ChartDrawState): void => {
  const { width, height, game, candles } = state
  const { left, right, top, bottom } = getPlotRect(width, height)

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, height)

  const now = Date.now()

  // Інтервал між свічками (мс), фолбек для < 2 свічок.
  const interval =
    candles.length >= 2 ? candles[1].time - candles[0].time : 60_000

  // Горизонтальний зум: visibleCount керує, скільки історії видно ліворуч від now.
  const count = Math.max(2, state.visibleCount || candles.length || 2)

  // Єдина лінійна часова вісь. Права межа = max(endTime, now): після кінця гри
  // не обрізаємо живу лінію — вона малюється далі, а маркер кінця лишається на місці.
  const endTime = game.endTime
  const axisEnd = Math.max(endTime, now)
  const leftTime = now - count * interval
  const span = axisEnd - leftTime || 1
  const timeToX: TimeToX = (t) => left + ((t - leftTime) / span) * (right - left)

  const nowX = timeToX(now)
  // Ліва межа жовтої колонки = відкриття прийому ставок (у минулому), кламп до видимого вікна.
  const betOpenX = Math.max(left, timeToX(game.betOpenTime))
  const betCloseX = timeToX(game.betCloseTime)
  const endX = Math.min(right, timeToX(endTime)) // межа сірої колонки / маркер кінця

  drawPriceAxis(ctx, state.priceRange, top, bottom, right, width)
  drawGameColumns(ctx, betOpenX, betCloseX, endX, nowX, right, top, bottom)

  // Кліп кривої/свічок межами тіла графіка (A6) — за екстремального зуму/пану
  // ціна не мусить «виїжджати» на сусідні блоки (мітки часу зверху, легенду знизу).
  withPlotClip(ctx, left, right, top, bottom, () => {
    if (state.mode === 'line') {
      drawLine(ctx, state, timeToX, leftTime, now, top, bottom)
    } else {
      drawCandles(ctx, state, timeToX, leftTime, now, interval, top, bottom)
    }
  })

  // Верхня і нижня межові лінії зони графіка (A4) — малюємо ПІСЛЯ кривої,
  // щоб чітко відділяли зону навіть якщо крива торкається краю.
  drawPlotBounds(ctx, left, right, top, bottom)


  drawBetMarkers(ctx, state, right, top, bottom)
  drawCurrentPrice(ctx, state, left, right, top, bottom)
  // Завершена гра — без Y-контролера вибору ціни.
  if (state.interactive) {
    drawController(ctx, state, left, right, top, bottom)
  }
  drawTimeLabels(ctx, state, leftTime, betCloseX)
  void AXIS_WIDTH
}
