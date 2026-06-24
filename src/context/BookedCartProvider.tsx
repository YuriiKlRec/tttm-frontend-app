import { createContext, useCallback, useContext, useState, type FC, type ReactNode } from 'react'
import { includesPrice, removePrice } from '../utils/price'

/** Корзина заброньованих цін — глобальний стан (спільний для гри та сторінки оплати). */
export interface BookedCart {
  /** Ідентифікатор гри, до якої належать заброньовані ціни. */
  gameId: string | null
  /** Заброньовані ціни (у порядку додавання). */
  prices: number[]
  /** Встановити gameId корзини (викликати при переході до гри). */
  setGameId: (id: string) => void
  /** Додає ціну (ігнорує дублікат). */
  add: (price: number) => void
  /** Прибирає ціну. */
  remove: (price: number) => void
  /** Прибирає список цін (напр. неактивні + зайняті після виходу). */
  removeMany: (prices: number[]) => void
  /** Очищає корзину та скидає gameId. */
  clear: () => void
  /** Чи є ціна в корзині. */
  has: (price: number) => boolean
}

const BookedCartContext = createContext<BookedCart | null>(null)

/**
 * Провайдер глобальної корзини заброньованих цін. Зберігає gameId разом із
 * цінами, щоб BuyTicketsPage знала, до якої гри відносяться квитки.
 */
export const BookedCartProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [gameId, setGameIdRaw] = useState<string | null>(null)
  const [prices, setPrices] = useState<number[]>([])

  const setGameId = useCallback((id: string): void => {
    setGameIdRaw(id)
  }, [])

  const add = useCallback((price: number): void => {
    setPrices((prev) => (includesPrice(prev, price) ? prev : [...prev, price]))
  }, [])

  const remove = useCallback((price: number): void => {
    setPrices((prev) => removePrice(prev, price))
  }, [])

  const removeMany = useCallback((toRemove: number[]): void => {
    setPrices((prev) => prev.filter((p) => !includesPrice(toRemove, p)))
  }, [])

  const clear = useCallback((): void => {
    setPrices([])
    setGameIdRaw(null)
  }, [])

  const has = useCallback((price: number): boolean => includesPrice(prices, price), [prices])

  return (
    <BookedCartContext.Provider value={{ gameId, prices, setGameId, add, remove, removeMany, clear, has }}>
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
