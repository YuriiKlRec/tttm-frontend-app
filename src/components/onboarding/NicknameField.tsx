import type { FC } from 'react'
import type { NicknameInput } from '../../hooks/useNicknameInput'
import { useT } from '../../i18n/useT'

/** Пропси поля вводу нікнейму. */
interface NicknameFieldProps {
  /** Стан/API поля з хука useNicknameInput. */
  input: NicknameInput
  /**
   * Серверна помилка валідації (наприклад, нік уже зайнятий за даними бекенду).
   * Відображається у тому ж стилі, що й клієнтська помилка. Пріоритет нижчий за
   * клієнтську — якщо showError вже активний, serverError ігнорується.
   */
  serverError?: string
  /**
   * Підказка під полем (напр. «Your nickname will be visible to all players»).
   * Показується лише за відсутності помилки валідації — інакше її місце займає текст помилки.
   */
  description?: string
}

/** Класи рамки/фону за станом (норма / помилка). */
const stateClass = (showError: boolean): string =>
  showError
    ? 'border-[#e5484d] bg-[rgba(229,72,77,0.1)]'
    : 'border-text-primary bg-[rgba(255,255,255,0.1)]'

/**
 * Контрольоване поле нікнейму з обов'язковим префіксом `@`.
 * Показує повідомлення про помилку під полем у стані помилки.
 * Примітка: input.error та serverError можуть містити i18n-ключ (рядок виду
 * "errors.nicknameFormat"), тому відображаємо через t().
 */
export const NicknameField: FC<NicknameFieldProps> = ({ input, serverError, description }) => {
  const { t } = useT()
  // Клієнтська помилка має пріоритет; серверна показується лише за валідного формату.
  // Обидва значення можуть бути i18n-ключами — завжди пропускаємо через t().
  const activeError = input.showError ? input.error : (serverError ?? '')
  const hasError = input.showError || (!input.showError && Boolean(serverError))

  return (
    <div className="w-full">
      <label htmlFor="nickname" className="sr-only">
        {t('onboarding.nicknameLabel')}
      </label>
      <input
        id="nickname"
        type="text"
        value={input.value}
        onChange={(event) => input.onChange(event.target.value)}
        placeholder={t('onboarding.nicknamePlaceholder')}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={hasError}
        aria-describedby={hasError ? 'nickname-error' : undefined}
        className={`h-12 w-full border px-4 text-center font-mono text-[18px] font-bold text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${stateClass(
          hasError,
        )}`}
      />
      {hasError ? (
        <p id="nickname-error" className="mt-2 text-center font-body text-[12px] text-[#e5484d]">
          {t(activeError)}
        </p>
      ) : description ? (
        <p className="mt-2 text-center font-body text-[12px] font-normal text-text-secondary">
          {description}
        </p>
      ) : null}
    </div>
  )
}
