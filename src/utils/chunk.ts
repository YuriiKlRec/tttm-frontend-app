/** Утиліти розбиття масивів на групи фіксованого розміру. */

/**
 * Розбиває масив на групи по `size` елементів (остання група може бути меншою).
 * Чиста функція без побічних ефектів.
 * @param items вихідний масив
 * @param size максимальний розмір однієї групи (має бути > 0)
 * @returns масив груп; порожній масив, якщо `items` порожній
 */
export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  if (size <= 0) {
    throw new Error('chunk: розмір групи має бути додатним')
  }
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}
