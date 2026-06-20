import type { FC } from 'react'
import type { NicknameInput } from '../../hooks/useNicknameInput'

/** Пропси поля вводу нікнейму. */
interface NicknameFieldProps {
  /** Стан/API поля з хука useNicknameInput. */
  input: NicknameInput
}

/** Класи рамки/фону за станом (норма / помилка). */
const stateClass = (showError: boolean): string =>
  showError
    ? 'border-[#e5484d] bg-[rgba(229,72,77,0.1)]'
    : 'border-text-primary bg-[rgba(255,255,255,0.1)]'

/**
 * Контрольоване поле нікнейму з обов'язковим префіксом `@`.
 * Показує повідомлення про помилку під полем у стані помилки.
 */
export const NicknameField: FC<NicknameFieldProps> = ({ input }) => (
  <div className="w-full">
    <label htmlFor="nickname" className="sr-only">
      Nickname
    </label>
    <input
      id="nickname"
      type="text"
      value={input.value}
      onChange={(event) => input.onChange(event.target.value)}
      placeholder="@somebody"
      autoComplete="off"
      autoCapitalize="none"
      spellCheck={false}
      aria-invalid={input.showError}
      aria-describedby={input.showError ? 'nickname-error' : undefined}
      className={`h-12 w-full border px-4 text-center font-mono text-[18px] font-bold text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${stateClass(
        input.showError,
      )}`}
    />
    {input.showError && (
      <p id="nickname-error" className="mt-2 text-center font-body text-[12px] text-[#e5484d]">
        {input.error}
      </p>
    )}
  </div>
)
