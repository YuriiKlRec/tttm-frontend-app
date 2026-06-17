import { useRef, type FC } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TopBar } from './TopBar'
import { StatusLine } from './StatusLine'
import { BottomNav } from './BottomNav'
import { PixelGrid } from './PixelGrid'
import { getTabIndexByPath } from '../../constants/tabs'

/**
 * Каркас застосунку: фіксовані TopBar + StatusLine зверху, фіксований BottomNav знизу,
 * центральна область зі скролом і slide-переходами між вкладками.
 * Фонова сітка покриває весь viewport і лишається на місці при скролі.
 */
export const AppLayout: FC = () => {
  const location = useLocation()
  const prevIndex = useRef<number>(getTabIndexByPath(location.pathname))

  const currentIndex = getTabIndexByPath(location.pathname)
  const direction = currentIndex >= prevIndex.current ? 1 : -1
  prevIndex.current = currentIndex

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
      <PixelGrid />
      <TopBar />
      <StatusLine />

      <main className="scrollbar-hide relative flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={location.pathname}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ x: `${dir * 100}%`, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir: number) => ({ x: `${dir * -100}%`, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative flex min-h-full flex-col items-center justify-start gap-8 pt-8 pb-10"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  )
}
