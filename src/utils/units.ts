/**
 * Конвертація nanoTON → рядок TON.
 * Приклад: nanoToTon(100_000_000) → "0.1", nanoToTon(1_000_000_000) → "1"
 */
export function nanoToTon(nano: number): string {
  const ton = nano / 1e9;
  // parseFloat прибирає зайві нулі після коми
  return parseFloat(ton.toFixed(9)).toString();
}

/**
 * Конвертація центів → USD рядок із символом і роздільниками.
 * Приклад: centsToUsd(6_568_201) → "$65,682.01"
 */
export function centsToUsd(cents: number): string {
  const usd = cents / 100;
  return usd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Конвертація секунд → мілісекунди.
 * Використовується для JWT-часових міток і таймерів.
 */
export function secToMs(seconds: number): number {
  return seconds * 1000;
}
