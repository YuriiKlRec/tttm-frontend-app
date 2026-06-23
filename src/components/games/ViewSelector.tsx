import { useEffect, useRef, useState, type FC } from 'react'
import type { ViewMode } from '../../types/game'
import { Glyph, type GlyphName } from '../ui/Glyph'

/** Пропси дропдауну вибору виду центральної області. */
interface ViewSelectorProps {
  /** Поточний обраний вид. */
  value: ViewMode
  /** Колбек зміни виду. */
  onChange: (value: ViewMode) => void
  /** Доступні види (для завершеної гри — без графіка). */
  options?: ViewMode[]
}

/** Людиночитні лейбли видів. */
const LABELS: Record<ViewMode, string> = {
  chart: 'Chart',
  bets: 'Predictions',
  details: 'Details',
}

/** Гліф кожного виду (перефарбовується через currentColor). */
const ICONS: Record<ViewMode, GlyphName> = {
  chart: 'chart-line',
  bets: 'bitcoin',
  details: 'info-circle',
}

const ALL_OPTIONS: ViewMode[] = ['chart', 'bets', 'details']

/**
 * Дропдаун вибору виду (Chart / Predictions / Details) у форматі SmallControl.
 * Кнопка показує іконку+лейбл поточного виду; меню (surface-фон) перелічує види
 * з іконками, активний — оранжевий. Esc та клік поза меню закривають його.
 */
export const ViewSelector: FC<ViewSelectorProps> = ({ value, onChange, options = ALL_OPTIONS }) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const select = (mode: ViewMode): void => {
    onChange(mode)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-7 items-center gap-2 bg-[#ef9723] px-2 text-[#323232] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Glyph name={ICONS[value]} className="h-4 w-4" />
        <span className="font-mono text-[13px] font-bold">{LABELS[value]}</span>
        <Glyph name="caret" className="h-[5px] w-2" />
      </button>

      {open ? (
        <ul
          role="menu"
          className="absolute left-0 top-[calc(100%+6px)] z-30 flex min-w-[140px] flex-col gap-3 bg-surface p-3"
        >
          {options.map((mode) => (
            <li key={mode} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => select(mode)}
                className={`flex w-full items-center gap-2 px-2 py-1 text-left font-mono text-[15px] font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
                  mode === value ? 'text-text-focus' : 'text-text-primary'
                }`}
              >
                <Glyph name={ICONS[mode]} className="h-4 w-4" />
                {LABELS[mode]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
