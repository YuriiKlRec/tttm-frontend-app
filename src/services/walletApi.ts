/**
 * HTTP-клієнт для ресурсу /api/wallets.
 *
 * Функції:
 *   saveWallet — реєструє гаманець користувача на бекенді.
 */

import { post } from './http';
import { env } from '../config/env';

/** Тіло запиту POST /api/wallets. */
export interface SaveWalletRequest {
  address: string;
  network: 'mainnet' | 'testnet';
}

/** Відповідь POST /api/wallets. */
export interface SaveWalletResponse {
  id: string;
  address: string;
  network: 'mainnet' | 'testnet';
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Зберігає адресу гаманця користувача на бекенді.
 * Викликати після підключення TonConnect-гаманця.
 *
 * @param address — адреса гаманця у raw-форматі (з useTonAddress)
 */
export async function saveWallet(address: string): Promise<void> {
  await post<SaveWalletResponse>('/api/wallets', {
    address,
    network: env.tonNetwork,
  } satisfies SaveWalletRequest);
}
