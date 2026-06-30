import type { FC } from 'react'
import type { PlayerPattern } from '../../types/profile'
import { PlayerPatternBar } from './PlayerPatternBar'
import { useT } from '../../i18n/useT'

/** Пропси фіксованого футера патерну гравця. */
interface PlayerPatternPanelProps {
  pattern: PlayerPattern
  /** Колбек для кнопки «Go back». */
  onGoBack: () => void
}

/**
 * Фіксований футер сторінки профілю: показує тип патерну гравця
 * (текст + вертикальний gauge) та кнопку повернення назад.
 *
 * Враховує безпечну зону знизу через CSS-змінну `--app-safe-bottom`.
 */
export const PlayerPatternPanel: FC<PlayerPatternPanelProps> = ({ pattern, onGoBack }) => {
  const { t } = useT()

  return (
    <div
      className="flex flex-col gap-4 border-t border-border-dashed bg-surface py-4"
      style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 1rem)' }}
    >
      {/* Рядок: назва патерну зліва + gauge справа */}
      <div className="flex items-center justify-between px-7">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[13px] font-bold text-text-primary">
            {t('profile.playerPattern')}
          </span>
          <span className="font-display text-[24px] text-text-primary">
            {pattern.type.toUpperCase()}
          </span>
        </div>

        <PlayerPatternBar type={pattern.type} level={pattern.level} />
      </div>

      {/* Кнопка повернення */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onGoBack}
          className="font-mono text-[15px] font-bold text-text-focus outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-focus"
        >
          {t('common.goBack')}
        </button>
      </div>
    </div>
  )
}
