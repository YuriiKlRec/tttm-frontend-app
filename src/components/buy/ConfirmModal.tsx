import type { FC } from 'react'
import { PredictionButton } from '../ui/PredictionButton'

/** Опис кнопки дії модалки. */
interface ModalAction {
  /** Підпис. */
  label: string
  /** Обробник кліку. */
  onClick: () => void
  /** Варіант кольору (за замовчуванням primary). */
  variant?: 'primary' | 'inverse'
}

/** Пропси перевикористовуваної модалки підтвердження. */
interface ConfirmModalProps {
  /** Шлях до іконки-емблеми (32×32). */
  emblem: string
  /** Заголовок (font-display, верхній регістр у макеті). */
  title: string
  /** Пояснювальний текст. */
  message: string
  /** Кнопки дії: одна (OK) або дві (Cancel + OK). */
  actions: ModalAction[]
}

/**
 * Повноекранний оверлей із піксельною модалкою (рамка text-focus, емблема,
 * заголовок font-display, текст, 1–2 CTA). Закриття — лише через кнопки.
 */
export const ConfirmModal: FC<ConfirmModalProps> = ({ emblem, title, message, actions }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-7"
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div className="flex w-[300px] flex-col items-center gap-6 border-2 border-text-focus bg-surface px-7 pt-9 pb-7">
      <img src={emblem} alt="" aria-hidden="true" className="h-8 w-8" />
      <div className="flex w-full flex-col items-center gap-3 text-center">
        <h2 className="font-display text-[20px] text-text-primary">{title}</h2>
        <p className="font-body text-[15px] text-text-primary">{message}</p>
      </div>
      <div className="flex w-full items-center gap-6">
        {actions.map((action) => (
          <PredictionButton
            key={action.label}
            label={action.label}
            variant={action.variant ?? 'primary'}
            onClick={action.onClick}
          />
        ))}
      </div>
    </div>
  </div>
)
