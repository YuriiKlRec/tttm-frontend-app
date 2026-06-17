import type { FC } from 'react'

/**
 * Дрібна піксельна сітка-бекдроп на весь батьківський контейнер.
 * Декоративна (aria-hidden), не перехоплює події, лежить абсолютно поверх фону.
 * Переюзується в AppLayout та GameLayout.
 */
const gridStyle = {
  backgroundImage:
    'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),' +
    'linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
  backgroundSize: '7px 7px',
}

/** Фонова піксельна сітка (фікс-бекдроп, не скролиться разом з вмістом). */
export const PixelGrid: FC = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0"
    style={gridStyle}
  />
)
