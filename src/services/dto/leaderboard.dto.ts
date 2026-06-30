/** DTO одного рядка лідерборду (відповідає бекенд-відповіді GET /api/leaderboard). */
export interface LeaderEntryDto {
  id: string;
  nickname: string;
  wins: number;
}

/** DTO відповіді GET /api/leaderboard. */
export interface LeaderboardDto {
  leaders: LeaderEntryDto[];
}
