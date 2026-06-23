import type { WalletDto } from './wallet.dto';

/** DTO користувача (відповідає полям моделі User на бекенді). */
export interface UserDto {
  id: string;
  nickname: string;
  role: 'player' | 'partner' | 'admin';
  termsAccepted: boolean;
  timezone: string | null;
  wallets: WalletDto[];
}
