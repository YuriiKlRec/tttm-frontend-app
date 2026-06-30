import type { FC } from 'react'
import { PredictionButton } from '../ui/PredictionButton'
import { useT } from '../../i18n/useT'

/** Пропси панелі дій угоди. */
interface TermsActionsProps {
  /** Чи прокручено до самого низу зараз. */
  atBottom: boolean
  /** Чи користувач уже доходив до низу (sticky). */
  reachedEnd: boolean
  /** Прийняти угоду й піти далі. */
  onAccept: () => void
  /** Прокрутити донизу. */
  onScrollBottom: () => void
  /** Прокрутити догори. */
  onScrollTop: () => void
}

/**
 * Панель дій під текстом угоди. До першого досягнення низу показує лише
 * білу кнопку прокрутки; після — оранжеву «Accept and Continue» плюс білу
 * кнопку-перемикач (Scroll top/bottom залежно від поточної позиції).
 */
export const TermsActions: FC<TermsActionsProps> = ({
  atBottom,
  reachedEnd,
  onAccept,
  onScrollBottom,
  onScrollTop,
}) => {
  const { t } = useT()

  if (!reachedEnd) {
    return <PredictionButton variant="inverse" label={t('terms.scrollBottom')} onClick={onScrollBottom} />
  }

  return (
    <div className="flex flex-col gap-4">
      <PredictionButton label={t('terms.acceptAndContinue')} onClick={onAccept} />
      {atBottom ? (
        <PredictionButton variant="inverse" label={t('terms.scrollTop')} onClick={onScrollTop} />
      ) : (
        <PredictionButton variant="inverse" label={t('terms.scrollBottom')} onClick={onScrollBottom} />
      )}
    </div>
  )
}
