import type { FC } from 'react'

/** Пропси іконки-підказки легенди. */
interface HintIconProps {
  /** SVG-гліф жесту. */
  overlay: string
}

/**
 * Іконка підказки 16px: гліф жесту, відцентрований у боксі (object-contain),
 * щоб вертикально вирівнюватись із текстом легенди. Базова «рука» в експорті
 * Figma порожня, тож показуємо лише гліф.
 */
export const HintIcon: FC<HintIconProps> = ({ overlay }) => (
  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
    <img
      src={overlay}
      alt=""
      aria-hidden="true"
      className="max-h-full max-w-full object-contain"
    />
  </span>
)
