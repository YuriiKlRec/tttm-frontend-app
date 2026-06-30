import { useEffect, useRef, type FC } from 'react'
import { FieldLabel } from './FieldLabel'
import { FieldError } from './FieldError'
import { useT } from '../../i18n/useT'

/** Пропси поля назви гри. */
interface GameNameFieldProps {
  /** Поточне значення. */
  value: string
  /** Обробник зміни. */
  onChange: (value: string) => void
  /** Обробник blur (для відкладеного показу помилки). */
  onBlur: () => void
  /** Текст помилки (null — без помилки). */
  error: string | null
}

/** Класи рамки/фону за станом (норма / помилка). */
const stateClass = (hasError: boolean): string =>
  hasError ? 'border-[#e5484d] bg-[rgba(229,72,77,0.1)]' : 'border-text-primary bg-[rgba(255,255,255,0.1)]'

/**
 * Поле назви гри: автофокус при відкритті, maxLength 50, мін. 3 символи.
 * Дозволені будь-які символи — обмежуємо лише довжину. Помилка — після blur.
 */
export const GameNameField: FC<GameNameFieldProps> = ({ value, onChange, onBlur, error }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useT()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex w-full flex-col gap-3">
      <FieldLabel htmlFor="game-name">{t('createGame.gameNameLabel')}</FieldLabel>
      <input
        id="game-name"
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        maxLength={50}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'game-name-error' : undefined}
        className={`h-12 w-full border px-4 font-mono text-[18px] font-bold text-text-primary placeholder:text-text-secondary focus:outline-none ${stateClass(
          Boolean(error),
        )}`}
      />
      <FieldError id="game-name-error" message={error} />
    </div>
  )
}
