/** Утиліти валідації нікнейму (лише формат). */

/** Результат валідації ніка: чи валідний і текст помилки (порожній якщо ок). */
export interface NicknameValidation {
  /** Чи нік проходить формат. */
  valid: boolean
  /** Повідомлення про помилку (порожнє, якщо все гаразд). */
  error: string
}

/** Ключ i18n для помилки невірного формату — відображається через t() у виклику. */
const FORMAT_ERROR = 'errors.nicknameFormat'

/** Формат: 3–20 символів, лише латиниця/цифри/`_`, перший символ — літера. */
const NICKNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/

/** Прибирає провідний `@` (якщо є) — для роботи з "чистим" ніком. */
export const stripAt = (raw: string): string => raw.replace(/^@/, '')

/**
 * Валідує нік: лише формат (довжина та дозволені символи).
 * Перевірка унікальності делегована серверу — PUT /api/me повертає 422
 * при зайнятому ніку, що підхоплюється через serverError у NicknameField.
 * Очікує "чистий" нік без `@`.
 */
export const validateNickname = (nick: string): NicknameValidation => {
  if (!NICKNAME_PATTERN.test(nick)) {
    return { valid: false, error: FORMAT_ERROR }
  }
  return { valid: true, error: '' }
}
