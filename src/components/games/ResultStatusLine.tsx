import type { FC } from 'react'
import type { ResultStatus } from '../../types/results'
import { useT } from '../../i18n/useT'
import checkGreenIcon from '../../assets/icon-check-green.svg'
import checkGrayIcon from '../../assets/icon-check-gray.svg'
import timesGrayIcon from '../../assets/icon-times-gray.svg'

/** Дескриптор підсумкового рядка статусу. */
interface StatusDescriptor {
  /** Ключ i18n тексту статусу. */
  textKey: string
  /** Колір тексту (Tailwind-клас). */
  color: string
  /** Іконка зліва (URL) — або null для крапки processing. */
  icon: string | null
}

/** Мапа станів гри на вигляд статус-рядка. */
const STATUS: Record<ResultStatus, StatusDescriptor> = {
  won: { textKey: 'results.youReceivedReward', color: 'text-text-success', icon: checkGreenIcon },
  lost: { textKey: 'results.winnerReceivedReward', color: 'text-text-secondary', icon: checkGrayIcon },
  processing: { textKey: 'results.processing', color: 'text-text-focus', icon: null },
  cancelled: { textKey: 'results.closedAutomatically', color: 'text-text-secondary', icon: timesGrayIcon },
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
  const { textKey, color, icon } = STATUS[status]
  const { t } = useT()

  return (
    <p className={`flex items-center justify-center gap-2 font-body text-[13px] ${color}`}>
      {icon ? (
        <img src={icon} alt="" aria-hidden="true" className="h-4 w-4" />
      ) : (
        <span className="h-2.5 w-2.5 bg-text-focus" aria-hidden="true" />
      )}
      {t(textKey)}
    </p>
  )
}
