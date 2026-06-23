import type { UserDto } from './user.dto';

/** tonData тікета, заповнюється після підтвердження транзакції. */
export interface TicketTonData {
  transactionHash: string;
  boc: string;
}

/** DTO тікета (відповідає полям моделі Ticket на бекенді). */
export interface TicketDto {
  id: string;
  /** BTC прогноз користувача у центах (×100). */
  price: number;
  gameId: string;
  ownerId: string;
  /** Статус затвердження тікета. */
  approved: boolean;
  /** Час затвердження тікета, null якщо не затверджено. */
  approvedAt: string | null;
  createdAt: string;
  owner: UserDto;
  tonData: TicketTonData | null;
}
