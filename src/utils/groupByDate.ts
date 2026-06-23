/** Утиліти групування елементів за календарною датою (для списку Results). */

/** Група елементів під однією датою-заголовком. */
export interface DateGroup<T> {
  /** Ключ групи (YYYY-MM-DD) — для стабільного React-key. */
  key: string
  /** Підпис групи: «Today», «Yesterday» або «Jun 6». */
  label: string
  /** Елементи групи (порядок збережено з вхідного масиву). */
  items: T[]
}

const DAY_MS = 86_400_000

/** Повертає опівнічний epoch ms (локальний) для дати з epoch ms. */
const startOfDay = (epochMs: number): number => {
  const date = new Date(epochMs)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Ключ дати у форматі YYYY-MM-DD (локальний час). */
const dateKey = (epochMs: number): string => {
  const date = new Date(epochMs)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Формує підпис дати відносно «сьогодні»: «Today», «Yesterday»
 * або коротка дата «Jun 6» (без року).
 */
const dateLabel = (epochMs: number, todayStart: number): string => {
  const diffDays = Math.round((todayStart - startOfDay(epochMs)) / DAY_MS)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  const date = new Date(epochMs)
  return `${date.toLocaleString('en-US', { month: 'short' })} ${date.getDate()}`
}

/**
 * Групує елементи за календарною датою (спадання — новіші зверху).
 * `getTime` витягує epoch ms з елемента; групи сортуються від найновішої.
 * Чиста функція без побічних ефектів — придатна для useMemo.
 */
export const groupByDate = <T>(items: T[], getTime: (item: T) => number): DateGroup<T>[] => {
  const todayStart = startOfDay(Date.now())
  const map = new Map<string, DateGroup<T>>()

  for (const item of items) {
    const time = getTime(item)
    const key = dateKey(time)
    const group = map.get(key)
    if (group) {
      group.items.push(item)
    } else {
      map.set(key, { key, label: dateLabel(time, todayStart), items: [item] })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key))
}
