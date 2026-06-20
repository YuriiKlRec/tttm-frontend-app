/** Утиліти валідації нікнейму (формат + перевірка зайнятості). */

import { takenNicknames } from '../mocks/profile'

/** Результат валідації ніка: чи валідний і текст помилки (порожній якщо ок). */
export interface NicknameValidation {
  /** Чи нік проходить формат і не зайнятий. */
  valid: boolean
  /** Повідомлення про помилку (порожнє, якщо все гаразд). */
  error: string
}

/** Текст помилки невірного формату. */
const FORMAT_ERROR = 'Use 3-20 letters, digits or _'
/** Текст помилки зайнятого ніка. */
const TAKEN_ERROR = 'This nickname is already taken. Try another one'

/** Формат: 3–20 символів, лише латиниця/цифри/`_`, перший символ — літера. */
const NICKNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/

/** Прибирає провідний `@` (якщо є) — для роботи з "чистим" ніком. */
export const stripAt = (raw: string): string => raw.replace(/^@/, '')

/**
 * Валідує нік: спершу формат, потім зайнятість (lowercase порівняння).
 * Очікує "чистий" нік без `@`.
 */
export const validateNickname = (nick: string): NicknameValidation => {
  if (!NICKNAME_PATTERN.test(nick)) {
    return { valid: false, error: FORMAT_ERROR }
  }
  if (takenNicknames.includes(nick.toLowerCase())) {
    return { valid: false, error: TAKEN_ERROR }
  }
  return { valid: true, error: '' }
}
