import type { FC, ReactNode } from 'react'
import { PixelGrid } from './PixelGrid'

/** Пропси шелла сторінки гри. */
interface GameLayoutProps {
  /** Фіксована шапка зверху. */
  header: ReactNode
  /** Фіксований підвал знизу (немає для завершеної гри). */
  footer?: ReactNode
  /** Вміст центральної області (займає весь простір між шапкою і підвалом). */
  children?: ReactNode
}

/**
 * Презентаційний каркас окремої сторінки гри: фіксована шапка зверху,
 * фіксований підвал знизу, скрол/вміст у центрі (flex-1, overflow-hidden).
 * Фонова сітка покриває весь viewport. Safe-area обробляють header/footer самі.
 */
export const GameLayout: FC<GameLayoutProps> = ({ header, footer, children }) => (
  <div className="relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
    <PixelGrid />
    {header}
    <main className="relative z-10 flex-1 overflow-hidden">{children}</main>
    {footer}
  </div>
)
