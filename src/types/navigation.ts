import type { FC, SVGProps } from 'react'

/** Ключі вкладок нижньої навігації (порядок = індекс для slide-переходів) */
export type TabKey = 'predictions' | 'waiting' | 'results' | 'leaders'

/** Опис одного пункту нижньої навігації */
export interface NavTab {
  /** Унікальний ключ вкладки */
  key: TabKey
  /** Шлях маршруту */
  path: string
  /** Підпис під іконкою */
  label: string
  /** Іконка як React-компонент (fill = currentColor) */
  Icon: FC<SVGProps<SVGSVGElement>>
  /** Значення бейджа; null — без бейджа */
  badge: number | null
}
