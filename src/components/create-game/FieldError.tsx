import type { FC } from 'react'

/** Пропси підпису помилки поля. */
interface FieldErrorProps {
  /** id для aria-describedby. */
  id: string
  /** Текст помилки (якщо null — нічого не рендериться). */
  message: string | null
}

/** Підпис помилки під полем (червоний, font-body 12px). */
export const FieldError: FC<FieldErrorProps> = ({ id, message }) =>
  message ? (
    <p id={id} className="font-body text-[12px] text-[#e5484d]">
      {message}
    </p>
  ) : null
