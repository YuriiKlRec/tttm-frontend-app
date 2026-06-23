/** DTO гаманця (відповідає полям моделі Wallet на бекенді). */
export interface WalletDto {
  id: string;
  address: string;
  network: string;
  isActive: boolean;
}
