import type { FC, ReactNode } from 'react'

/** Пропси контейнера-картки з піксельними кутами. */
interface PixelCardProps {
  /** Вміст картки (рендериться поверх смуг, z-10). */
  children: ReactNode
  /** Додаткові класи для зовнішнього контейнера (відступи від країв, ширина). */
  className?: string
  /** Додаткові класи для контент-обгортки (падинги/розкладка вмісту). */
  contentClassName?: string
}

/**
 * Переюзабельний surface-контейнер з піксельними (8-біт) кутами.
 * Кути відтворені двома перехресними смугами замість гладкого скруглення:
 * вертикальна виступає на 8px зверху/знизу, горизонтальна — з боків.
 */
export const PixelCard: FC<PixelCardProps> = ({ children, className, contentClassName }) => (
  <div className={`relative bg-surface ${className ?? ''}`}>
    {/* вертикальна смуга: виступає на 8px зверху/знизу, звужена на 8px з боків */}
    <div className="absolute inset-x-2 -inset-y-2 bg-surface" aria-hidden="true" />
    {/* горизонтальна смуга: виступає на 8px з боків, звужена на 8px зверху/знизу */}
    <div className="absolute -inset-x-2 inset-y-2 bg-surface" aria-hidden="true" />
    <div className={`relative z-10 flex flex-col ${contentClassName ?? ''}`}>{children}</div>
  </div>
)
