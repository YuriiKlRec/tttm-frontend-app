import { useEffect, useState } from 'react'
import type { ChartIcons } from './chartTypes'
import btcIcon from '../../../assets/icon-btc.svg'
import ticketIcon from '../../../assets/icon-ticket.svg'
import ticketRedIcon from '../../../assets/icon-ticket-red.svg'

/** Завантажує одне зображення, повертає Promise з елементом (або null при помилці). */
const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

/**
 * Передзавантажує растрові іконки для малювання на canvas.
 * Поки не завантажено — повертає null (рендер використовує fallback-форми).
 */
export const useChartIcons = (): ChartIcons | null => {
  const [icons, setIcons] = useState<ChartIcons | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([loadImage(btcIcon), loadImage(ticketIcon), loadImage(ticketRedIcon)]).then(
      ([btc, ticket, ticketRed]) => {
        if (alive) {
          setIcons({ btc, ticket, ticketRed })
        }
      },
    )
    return () => {
      alive = false
    }
  }, [])

  return icons
}
