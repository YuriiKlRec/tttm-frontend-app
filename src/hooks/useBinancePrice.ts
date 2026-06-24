import { useEffect, useState } from 'react'
import { subscribeTradePrice } from '../services/binance'

/**
 * Підписується на живу ціну угод Binance для вказаної торгової пари.
 * Повертає останню ціну (number) або null до першого тіку.
 * Підписка закривається автоматично при розмонтуванні.
 *
 * @param symbol торгова пара, напр. "BTCUSDT"
 */
export const useBinancePrice = (symbol = 'BTCUSDT'): number | null => {
  const [price, setPrice] = useState<number | null>(null)

  useEffect(() => {
    // Підписуємось на WebSocket-стрім; повертається функція відписки
    const unsubscribe = subscribeTradePrice(symbol, setPrice)
    return unsubscribe
  }, [symbol])

  return price
}
