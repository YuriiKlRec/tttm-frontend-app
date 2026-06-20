import type { FC } from 'react'
import { PredictionButton } from '../ui/PredictionButton'

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
  if (!reachedEnd) {
    return <PredictionButton variant="inverse" label="Scroll bottom" onClick={onScrollBottom} />
  }

  return (
    <div className="flex flex-col gap-4">
      <PredictionButton label="Accept and Continue" onClick={onAccept} />
      {atBottom ? (
        <PredictionButton variant="inverse" label="Scroll top" onClick={onScrollTop} />
      ) : (
        <PredictionButton variant="inverse" label="Scroll bottom" onClick={onScrollBottom} />
      )}
    </div>
  )
}
