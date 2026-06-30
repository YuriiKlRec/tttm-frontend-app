/**
 * Утиліти для роботи з TON-explorer.
 * Базовий URL тестнет-explorer — testnet.tonviewer.com.
 */

/** Базовий URL TON-explorer (тестнет). */
const EXPLORER_BASE_URL = 'https://testnet.tonviewer.com';

/**
 * Формує повний URL адреси у TON-explorer.
 *
 * @param address — адреса контракту або гаманця (raw / friendly)
 * @returns Повний URL у вигляді `https://testnet.tonviewer.com/<address>`
 *
 * @example
 * explorerUrl('kQAYxxxxaNHx') // → 'https://testnet.tonviewer.com/kQAYxxxxaNHx'
 */
export function explorerUrl(address: string): string {
  return `${EXPLORER_BASE_URL}/${address}`;
}

/**
 * Скорочує адресу до формату «перші 4 + '...' + останні 4».
 * Якщо адреса коротша або рівна 8 символам — повертає без змін.
 *
 * @param address — адреса контракту або гаманця
 * @returns Скорочений рядок, напр. `kQAY...aNHx`
 *
 * @example
 * shortenHash('kQAYxxxxaNHx')  // → 'kQAY...aNHx'
 * shortenHash('short')         // → 'short'
 */
export function shortenHash(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
