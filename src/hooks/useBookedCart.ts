import { useCallback, useState } from 'react'
import { includesPrice, removePrice } from '../utils/price'

/** Корзина заброньованих цін — спільний стан футера й панелі Booked. */
export interface BookedCart {
  /** Заброньовані ціни (у порядку додавання). */
  prices: number[]
  /** Додає ціну (ігнорує дублікат). */
  add: (price: number) => void
  /** Прибирає ціну. */
  remove: (price: number) => void
  /** Очищає корзину. */
  clear: () => void
  /** Чи є ціна в корзині. */
  has: (price: number) => boolean
}

/**
 * Інкапсулює стан корзини заброньованих цін. Піднятий на рівень сторінки,
 * щоб ним користувались і футер (BetPanel), і панель перегляду (CartPanel).
 */
export const useBookedCart = (): BookedCart => {
  const [prices, setPrices] = useState<number[]>([])

  const add = useCallback((price: number): void => {
    setPrices((prev) => (includesPrice(prev, price) ? prev : [...prev, price]))
  }, [])

  const remove = useCallback((price: number): void => {
    setPrices((prev) => removePrice(prev, price))
  }, [])

  const clear = useCallback((): void => setPrices([]), [])

  const has = useCallback((price: number): boolean => includesPrice(prices, price), [prices])

  return { prices, add, remove, clear, has }
}
