import type { FC } from 'react'
import { useT } from '../../i18n/useT'

/** Пропси фіксованого футера профілю. */
interface PlayerPatternPanelProps {
  /** Колбек для кнопки «Go back». */
  onGoBack: () => void
}

/**
 * Фіксований футер сторінки профілю з кнопкою повернення назад.
 *
 * TODO: блок «Патерн гравця» (назва + вертикальний gauge PlayerPatternBar)
 * тимчасово прихований — фіча ще не реалізована на бекенді. Повернути рядок
 * з патерном (проп `pattern: PlayerPattern`), коли зʼявиться реалізація.
 *
 * Враховує безпечну зону знизу через CSS-змінну `--app-safe-bottom`.
 */
export const PlayerPatternPanel: FC<PlayerPatternPanelProps> = ({ onGoBack }) => {
  const { t } = useT()

  return (
    <div
      className="flex flex-col gap-4 border-t border-border-dashed bg-surface py-4"
      style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 1rem)' }}
    >
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
