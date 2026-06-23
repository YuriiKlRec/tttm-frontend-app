import type { FC } from 'react'

/** Пропси підпису поля. */
interface FieldLabelProps {
  /** Текст підпису. */
  children: string
  /** id пов'язаного контролу (для htmlFor). */
  htmlFor?: string
}

/** Підпис поля форми (font-mono, 15px), як у макеті над кожним інпутом. */
export const FieldLabel: FC<FieldLabelProps> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="w-full font-mono text-[15px] text-text-primary">
    {children}
  </label>
)
