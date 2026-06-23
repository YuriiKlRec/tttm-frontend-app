import type { TicketDto } from './ticket.dto';
import type { UserDto } from './user.dto';
import type { WalletDto } from './wallet.dto';

/** tonData гри: адреса контракту і мережа. */
export interface GameTonData {
  contractAddress: string;
  network: string;
}

/** DTO гри (відповідає полям моделі Game на бекенді + асоціації). */
export interface GameDto {
  id: string;
  name: string;
  targetCurrency: 'BTCUSDT';
  /** Ціна тікета у nanoTON (int). */
  ticketAmount: number;
  authorPercent: number;
  /** ISO-рядок часу завершення гри. */
  endTime: string;
  /** ISO-рядок дедлайну прийому ставок. */
  ticketDeadlineAt: string;
  status: 'new' | 'unpaid' | 'active' | 'expired';
  isFinalized: boolean;
  isClaimed: boolean;
  /** Фінальна ціна оракула у центах (×100), null до фіналізації. */
  oracleFinalPrice: number | null;
  winningTicketId: string | null;
  tonData: GameTonData;
  owner: UserDto;
  wallet: WalletDto | null;
  tickets: TicketDto[];
  winningTicket: TicketDto | null;
}

/** Пагінована відповідь. */
export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
}
