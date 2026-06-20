import { createContext, useCallback, useContext, useState, type FC, type ReactNode } from 'react'
import { includesPrice, removePrice } from '../utils/price'

/** Корзина заброньованих цін — глобальний стан (спільний для гри та сторінки оплати). */
export interface BookedCart {
  /** Заброньовані ціни (у порядку додавання). */
  prices: number[]
  /** Додає ціну (ігнорує дублікат). */
  add: (price: number) => void
  /** Прибирає ціну. */
  remove: (price: number) => void
  /** Прибирає список цін (напр. неактивні + зайняті після виходу). */
  removeMany: (prices: number[]) => void
  /** Очищає корзину. */
  clear: () => void
  /** Чи є ціна в корзині. */
  has: (price: number) => boolean
}

const BookedCartContext = createContext<BookedCart | null>(null)

/**
 * Провайдер глобальної корзини заброньованих цін. Обгортає застосунок, щоб
 * і сторінка гри (бронювання), і сторінка оплати читали той самий список.
 */
export const BookedCartProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<number[]>([])

  const add = useCallback((price: number): void => {
    setPrices((prev) => (includesPrice(prev, price) ? prev : [...prev, price]))
  }, [])

  const remove = useCallback((price: number): void => {
    setPrices((prev) => removePrice(prev, price))
  }, [])

  const removeMany = useCallback((toRemove: number[]): void => {
    setPrices((prev) => prev.filter((p) => !includesPrice(toRemove, p)))
  }, [])

  const clear = useCallback((): void => setPrices([]), [])

  const has = useCallback((price: number): boolean => includesPrice(prices, price), [prices])

  return (
    <BookedCartContext.Provider value={{ prices, add, remove, removeMany, clear, has }}>
      {children}
    </BookedCartContext.Provider>
  )
}

/** Доступ до глобальної корзини. Кидає помилку поза провайдером. */
export const useBookedCart = (): BookedCart => {
  const ctx = useContext(BookedCartContext)
  if (!ctx) {
    throw new Error('useBookedCart має використовуватись усередині BookedCartProvider')
  }
  return ctx
}
