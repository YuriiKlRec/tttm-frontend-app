import { useCallback, useMemo, useState } from 'react'
import { stripAt, validateNickname } from '../utils/nickname'

/** Публічний стан/API поля нікнейму. */
export interface NicknameInput {
  /** "Чистий" нік без `@` (те, що ввів користувач). */
  nick: string
  /** Значення для `<input value>` — завжди з префіксом `@`. */
  value: string
  /** Обробник зміни поля: зрізає провідний `@`, оновлює стан. */
  onChange: (raw: string) => void
  /** Чи нік валідний (формат ок і не зайнятий). */
  valid: boolean
  /** Текст помилки для показу під полем (порожній, якщо помилки нема). */
  error: string
  /** Чи показувати помилку (лише після початку вводу й за наявності помилки). */
  showError: boolean
}

/**
 * Інкапсулює стан і валідацію поля нікнейму.
 * `value` завжди містить провідний `@`, який не можна стерти.
 * Помилка показується тільки після того, як користувач почав вводити.
 * @param initialNick — початкове значення (напр. поточний нік користувача); `@`-префікс обрізається.
 *
 * `initialNick` часто ще не готовий на момент першого рендеру (auth асинхронний, напр.
 * при прямому переході на /edit-profile) — тоді useState-ініціалізатор захоплює порожній
 * рядок назавжди. Синхронізуємо `nick`, коли `initialNick` з'являється/змінюється, прямо
 * під час рендеру (паттерн React "adjusting state during render" — без ефекту й зайвого
 * ре-рендеру), але лише поки користувач ще не почав редагувати поле сам (`touched`) —
 * інакше вже введений текст затерло б пізнім оновленням `user` з AuthProvider.
 */
export const useNicknameInput = (initialNick?: string): NicknameInput => {
  const [nick, setNick] = useState<string>(() => stripAt(initialNick ?? ''))
  // Попереднє значення initialNick — щоб виявити його зміну прямо під час рендеру.
  const [prevInitialNick, setPrevInitialNick] = useState(initialNick)
  const [touched, setTouched] = useState(false)

  if (initialNick !== prevInitialNick) {
    setPrevInitialNick(initialNick)
    if (!touched && initialNick) {
      setNick(stripAt(initialNick))
    }
  }

  const onChange = useCallback((raw: string): void => {
    setTouched(true)
    setNick(stripAt(raw))
  }, [])

  const { valid, error } = useMemo(() => validateNickname(nick), [nick])

  // Показуємо помилку лише коли поле не порожнє (користувач почав вводити).
  const showError = nick.length > 0 && !valid

  return {
    nick,
    value: `@${nick}`,
    onChange,
    valid,
    error,
    showError,
  }
}
