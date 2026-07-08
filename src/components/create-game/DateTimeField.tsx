import type { FC } from 'react'
import { FieldLabel } from './FieldLabel'
import { FieldError } from './FieldError'
import { formatDateTimeFull, toDateTimeLocalValue } from '../../utils/datetime'
import { useLocale } from '../../i18n/locale'

/** Пропси стилізованого поля дати/часу з нативним пікером. */
interface DateTimeFieldProps {
  /** Підпис над полем (опційно — для deadline його малює батько). */
  label?: string
  /** Поточне значення (epoch ms). */
  value: number
  /** Обробник зміни (epoch ms); не потрібен для нередагованого поля. */
  onChange?: (epochMs: number) => void
  /** Чи редаговане поле (false — лише показ, без пікера). */
  editable?: boolean
  /** Текст помилки (null — без помилки). */
  error?: string | null
  /** id для зв'язку label/error. */
  id: string
  /** Нижня межа вибору (epoch ms) — обмежує нативний пікер. */
  min?: number
  /** Верхня межа вибору (epoch ms) — обмежує нативний пікер. */
  max?: number
}

/** Класи рамки/фону за станом (норма / помилка). */
const stateClass = (hasError: boolean): string =>
  hasError ? 'border-[#e5484d] bg-[rgba(229,72,77,0.1)]' : 'border-text-primary bg-[rgba(255,255,255,0.1)]'

/**
 * Стилізоване поле дати/часу: показує формат «24 Jun 2026 20:00:00»
 * (секунди — сірі), а нативний вибір відкриває прихований
 * `<input type="datetime-local">` через `showPicker()` по кліку.
 */
export const DateTimeField: FC<DateTimeFieldProps> = ({
  label,
  value,
  onChange,
  editable = true,
  error = null,
  id,
  min,
  max,
}) => {
  const locale = useLocale()
  const { main, seconds } = formatDateTimeFull(value, locale)
  const hasError = Boolean(error)

  const onInput = (raw: string): void => {
    if (!raw) return
    onChange?.(new Date(raw).getTime())
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <div
        className={`relative flex h-12 w-full items-center justify-center border px-4 font-mono text-[18px] font-bold ${stateClass(
          hasError,
        )}`}
      >
        <span className="text-text-primary">{main}</span>
        <span className="text-text-secondary">{seconds}</span>
        {/* Прозорий нативний datetime-local поверх поля: тап відкриває нативний
            пікер напряму (надійно в Telegram-вебвʼю, без showPicker). */}
        {editable && (
          <input
            id={id}
            type="datetime-local"
            value={toDateTimeLocalValue(value)}
            onChange={(event) => onInput(event.target.value)}
            min={min !== undefined ? toDateTimeLocalValue(min) : undefined}
            max={max !== undefined ? toDateTimeLocalValue(max) : undefined}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${id}-error` : undefined}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
          />
        )}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}
