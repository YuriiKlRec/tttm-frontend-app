import type { FC } from 'react'
import type { ResultStatus } from '../../types/results'
import checkGreenIcon from '../../assets/icon-check-green.svg'
import checkGrayIcon from '../../assets/icon-check-gray.svg'
import timesGrayIcon from '../../assets/icon-times-gray.svg'

/** Дескриптор підсумкового рядка статусу. */
interface StatusDescriptor {
  /** Текст статусу. */
  text: string
  /** Колір тексту (Tailwind-клас). */
  color: string
  /** Іконка зліва (URL) — або null для крапки processing. */
  icon: string | null
}

/** Мапа станів гри на вигляд статус-рядка. */
const STATUS: Record<ResultStatus, StatusDescriptor> = {
  won: { text: 'You have received a reward', color: 'text-text-success', icon: checkGreenIcon },
  lost: { text: 'The winner received a reward', color: 'text-text-secondary', icon: checkGrayIcon },
  processing: { text: 'Processing', color: 'text-text-focus', icon: null },
  cancelled: { text: 'Closed automatically', color: 'text-text-secondary', icon: timesGrayIcon },
}

/** Пропси підсумкового рядка статусу. */
interface ResultStatusLineProps {
  /** Підсумковий стан гри. */
  status: ResultStatus
}

/**
 * Нижній рядок статусу Result-картки: іконка (✓/✗ або оранжева крапка
 * для processing) + текст. Колір і текст залежать від стану гри.
 */
export const ResultStatusLine: FC<ResultStatusLineProps> = ({ status }) => {
  const { text, color, icon } = STATUS[status]

  return (
    <p className={`flex items-center justify-center gap-2 font-body text-[13px] ${color}`}>
      {icon ? (
        <img src={icon} alt="" aria-hidden="true" className="h-4 w-4" />
      ) : (
        <span className="h-2.5 w-2.5 bg-text-focus" aria-hidden="true" />
      )}
      {text}
    </p>
  )
}
