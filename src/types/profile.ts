/** Результат гри для гравця у списку профілю. */
export type GameOutcome = 'win' | 'miss' | 'pending'

/** Тип патерну гравця (формула рейтингу — пізніше). */
export type PatternType = 'optimist' | 'pessimist' | 'neutral'

/** Один рядок історії ігор у профілі. */
export interface ProfileGame {
  /** ID гри (для посилання на /game/:id). */
  id: string
  /** Назва гри. */
  name: string
  /** Кількість прогнозів (тікетів) гравця у цій грі. */
  predictions: number
  /** Сума у форматі "1.2 GRAM" (виграш для win, ставка для miss/pending). */
  amount: string
  /** Статус гри для гравця. */
  status: GameOutcome
  /** Скорочений хеш контракту "kQAY...aNHx" (null до фіналізації). */
  contractShort: string | null
  /** Повний URL контракту в explorer (null до фіналізації). */
  contractUrl: string | null
  /** Час гри (epoch ms) — показується лише для статусу pending; null інакше. */
  date: number | null
}

/** Патерн гравця: тип + рівень шкали 0..1 (формула пізніше). */
export interface PlayerPattern {
  type: PatternType
  level: number
}

/** View-модель сторінки профілю. */
export interface Profile {
  /** Нік з префіксом, напр. "@User_name". */
  nickname: string
  /** Винагороди у форматі "14.7 GRAM". */
  rewards: string
  gamesCount: number
  winCount: number
  ticketsCount: number
  games: ProfileGame[]
  /** Патерн гравця (поки заглушка до появи формули). */
  pattern: PlayerPattern
}
