import type { UserDto } from './user.dto';

/** tonData тікета, заповнюється після підтвердження транзакції. */
export interface TicketTonData {
  transactionHash: string;
  boc: string;
}

/** DTO тікета (відповідає полям моделі Ticket на бекенді). */
export interface TicketDto {
  id: string;
  /** Ціна тікета у nanoTON (int). */
  price: number;
  gameId: string;
  ownerId: string;
  createdAt: string;
  owner: UserDto;
  tonData: TicketTonData | null;
}
