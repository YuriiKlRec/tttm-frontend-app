import { useRef, type FC, type KeyboardEvent } from 'react'
import type { Language } from '../../services/i18nApi'
import { CheckIcon } from '../icons/CheckIcon'

/** Пропси списку вибору мови інтерфейсу. */
interface LanguageListProps {
  /** Підтримувані мови (код + назва). */
  languages: Language[]
  /** Код активної мови. */
  value: string
  /** Викликається з кодом обраної мови. */
  onChange: (code: string) => void
  /** id елемента-підпису (aria-labelledby) списку. */
  labelId: string
}

/** Класи рамки/фону/тексту пункту за станом вибору. */
const optionClass = (selected: boolean): string =>
  selected
    ? 'border-text-primary bg-[rgba(255,255,255,0.1)] text-text-primary'
    : 'border-text-secondary bg-transparent text-text-secondary'

/**
 * Список вибору мови інтерфейсу (ARIA listbox): кожен пункт — `role="option"`,
 * вибраний підсвічується білою рамкою/фоном/текстом (решта — приглушені).
 * Клавіатура: ArrowUp/ArrowDown перемикають і фокусують сусідній пункт,
 * Home/End — перший/останній (роумінг-tabindex, як у нативного select).
 */
export const LanguageList: FC<LanguageListProps> = ({ languages, value, onChange, labelId }) => {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  /** Обрати мову за індексом і перенести туди фокус. */
  const selectAt = (index: number): void => {
    const lang = languages[index]
    if (!lang) return
    onChange(lang.code)
    optionRefs.current[index]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const lastIndex = languages.length - 1
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectAt(index === lastIndex ? 0 : index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectAt(index === 0 ? lastIndex : index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      selectAt(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      selectAt(lastIndex)
    }
  }

  return (
    <div role="listbox" aria-labelledby={labelId} className="flex w-full flex-col gap-3">
      {languages.map((lng, index) => {
        const selected = lng.code === value
        return (
          <button
            key={lng.code}
            ref={(el) => {
              optionRefs.current[index] = el
            }}
            type="button"
            role="option"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(lng.code)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex h-12 w-full items-center justify-between border px-4 text-left font-mono text-[18px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${optionClass(selected)}`}
          >
            {lng.name}
            {selected && <CheckIcon aria-hidden="true" className="h-4 w-4 shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
