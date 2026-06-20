import { useMemo, type FC } from 'react'
import { motion } from 'framer-motion'

/** Кольори частинок конфеті (піксельна палітра). */
const COLORS = ['#54b566', '#ef9723', '#e5484d', '#9b5de5', '#f7c948', '#46a758']

/** Кількість частинок у вибуху. */
const COUNT = 28

/** Параметри однієї частинки, обчислені один раз на маунт. */
interface Particle {
  /** Кінцеве зміщення X (px). */
  x: number
  /** Кінцеве зміщення Y (px). */
  y: number
  /** Колір. */
  color: string
  /** Затримка старту (с). */
  delay: number
  /** Розмір сторони (px). */
  size: number
}

/** Генерує частинки з випадковими напрямком/відстанню/кольором. */
const buildParticles = (): Particle[] =>
  Array.from({ length: COUNT }, () => {
    const angle = Math.random() * Math.PI * 2
    const distance = 40 + Math.random() * 70
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.1,
      size: 5 + Math.round(Math.random() * 4),
    }
  })

/**
 * Анімований вибух конфеті: частинки розлітаються від центру (іконки успіху)
 * назовні з затуханням. Декоративний ефект, програється один раз на маунт.
 */
export const ConfettiBurst: FC = () => {
  const particles = useMemo(buildParticles, [])

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-0 h-0 w-0"
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: 1, opacity: 0 }}
          transition={{ duration: 1, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
