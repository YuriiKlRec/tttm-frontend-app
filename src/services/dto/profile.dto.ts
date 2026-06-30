/**
 * DTO-інтерфейси для відповіді GET /api/me/profile.
 * Відображають форму бекенд-відповіді без жодної логіки.
 */

/** DTO одного запису гри у профілі гравця. */
export interface ProfileGameDto {
  /** Унікальний ідентифікатор гри. */
  id: string;
  /** Назва гри. */
  name: string;
  /** Кількість прогнозів (тікетів) гравця у цій грі. */
  predictions: number;
  /** Сума у nanoTON (виграш для win, ставка для miss/pending). */
  amount: number;
  /** Статус гри для гравця. */
  status: 'win' | 'miss' | 'pending';
  /** Адреса контракту гри (null до фіналізації). */
  contractAddress: string | null;
  /** ISO-рядок часу завершення гри (endTime). */
  date: string;
}

/** DTO відповіді GET /api/me/profile. */
export interface ProfileDto {
  /** Загальна сума виграшів у nanoTON. */
  rewards: number;
  /** Загальна кількість ігор гравця. */
  gamesCount: number;
  /** Кількість виграних ігор. */
  winCount: number;
  /** Загальна кількість придбаних тікетів. */
  ticketsCount: number;
  /** Список ігор гравця. */
  games: ProfileGameDto[];
}
