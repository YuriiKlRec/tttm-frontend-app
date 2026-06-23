import { useMemo, useRef, type FC } from 'react'
import { motion, useInView } from 'framer-motion'

/** Кольори частинок конфеті (яскрава палітра хлопавки). */
const COLORS = ['#54b566', '#ef9723', '#e5484d', '#9b5de5', '#f7c948', '#46a758', '#3b9eff']

/** Кількість частинок у вибуху. */
const COUNT = 36

/** Параметри однієї частинки хлопавки. */
interface Particle {
  /** Горизонтальний розліт (px). */
  x: number
  /** Висота злету (px, вгору — відʼємне). */
  riseY: number
  /** Кінцеве падіння (px, вниз за межі). */
  fallY: number
  /** Колір. */
  color: string
  /** Затримка старту (с). */
  delay: number
  /** Ширина (px). */
  w: number
  /** Висота (px) — більша за ширину для «стрічок». */
  h: number
  /** Кінцевий кут обертання (deg). */
  rotate: number
  /** Тривалість польоту (с). */
  duration: number
}

/** Генерує частинки: радіальний розліт угору + падіння з гравітацією. */
const buildParticles = (): Particle[] =>
  Array.from({ length: COUNT }, () => {
    // Кут переважно у верхній півсфері (виліт «з хлопавки» вгору й убік).
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4
    const speed = 60 + Math.random() * 90
    const ribbon = Math.random() > 0.6
    return {
      x: Math.cos(angle) * speed,
      riseY: Math.sin(angle) * speed - 10,
      fallY: 120 + Math.random() * 80,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.08,
      w: ribbon ? 3 : 5 + Math.round(Math.random() * 3),
      h: ribbon ? 9 + Math.round(Math.random() * 4) : 5 + Math.round(Math.random() * 3),
      rotate: (Math.random() - 0.5) * 720,
      duration: 1.1 + Math.random() * 0.5,
    }
  })

/**
 * Анімований вибух конфеті у стилі хлопавки: частинки вистрілюють угору-вбік,
 * злітають, обертаються й падають із гравітацією, поступово зникаючи.
 * Запускається, коли блок потрапляє у видиму область (один раз).
 */
export const ConfettiBurst: FC = () => {
  const particles = useMemo(buildParticles, [])
  // Блок нульового розміру (точка центру) — спостерігаємо за будь-яким перетином.
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  return (
    <div ref={ref} className="pointer-events-none absolute left-1/2 top-0 h-0 w-0" aria-hidden="true">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[1px]"
          style={{ width: p.w, height: p.h, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0 }}
          animate={
            inView
              ? {
                  x: [0, p.x, p.x * 1.15],
                  y: [0, p.riseY, p.riseY + p.fallY],
                  rotate: [0, p.rotate * 0.6, p.rotate],
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 1, 0.9],
                }
              : { x: 0, y: 0, rotate: 0, opacity: 0, scale: 0 }
          }
          transition={{
            duration: p.duration,
            delay: p.delay,
            times: [0, 0.25, 1],
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}
