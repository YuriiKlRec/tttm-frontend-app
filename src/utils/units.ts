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
 * Форматує суму з суфіксом валюти (напр. "0.1 GRAM").
 * Параметризовано, щоб не дублювати formatter для екранів, де сума лишається у TON.
 * @param value — вже відформатоване число-рядок (напр. з nanoToTon)
 * @param unit — суфікс валюти; за замовчуванням GRAM (картка гри в списку)
 */
export function formatAmount(value: string, unit: string = 'GRAM'): string {
  return `${value} ${unit}`;
}
