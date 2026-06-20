import type { FC } from 'react'

/** Кількість зубців знизу чека (як у макеті). */
const TEETH_COUNT = 10

/**
 * Піксельні зубці знизу чека: ряд квадратів кольору фону, що «вирізають»
 * нижній край блоку, імітуючи відривний квиток. Декоративний елемент.
 */
export const CheckTeeth: FC = () => (
  <div
    className="absolute bottom-0 left-1/2 flex w-[304px] -translate-x-1/2 gap-4"
    aria-hidden="true"
  >
    {Array.from({ length: TEETH_COUNT }, (_, i) => (
      <span key={i} className="h-4 w-4 bg-background" />
    ))}
  </div>
)
