import { useEffect, useRef, type FC } from 'react'
import { useT } from '../../i18n/useT'
import {
  ONBOARDING_TEXT_COLOR_CLASS,
  type OnboardingSlide as OnboardingSlideConfig,
  type OnboardingTextPart,
} from '../../constants/onboardingSlides'

/** Пропси одного слайда онбордингу. */
interface OnboardingSlideProps {
  /** Конфіг слайда (медіа, тексти, overlay-прапорці). */
  slide: OnboardingSlideConfig
  /** Чи слайд зараз активний (у видимій області треку). */
  active: boolean
  /** Чи призупинено відтворення (утримання пальця). */
  paused: boolean
}

/** Рендер фрагментів тексту заголовка/підзаголовка з кольором за токеном Figma. */
const TextParts: FC<{ parts: OnboardingTextPart[] }> = ({ parts }) => {
  const { t } = useT()
  return (
    <>
      {parts.map((part) => (
        <span key={part.key} className={ONBOARDING_TEXT_COLOR_CLASS[part.color]}>
          {t(part.key)}
        </span>
      ))}
    </>
  )
}

/**
 * Один слайд stories-онбордингу: фонове зображення/відео (object-cover на весь
 * контейнер), затемнюючий overlay (слайди 4/5), чіп "The Ticket" (слайд 4)
 * і текстовий блок (заголовок + підзаголовок). Відео грає лише коли
 * слайд активний і не на паузі — керується через ref, щоб не витрачати ресурси
 * на фонові (неактивні) слайди в треку.
 */
export const OnboardingSlide: FC<OnboardingSlideProps> = ({ slide, active, paused }) => {
  const { t } = useT()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (active && !paused) {
      void el.play().catch(() => {
        // автоплей заблоковано браузером — ігноруємо, керування жестами лишається робочим
      })
    } else {
      el.pause()
    }
  }, [active, paused])

  return (
    <div className="relative h-full w-full shrink-0 overflow-hidden" aria-hidden={!active}>
      {slide.mediaType === 'image' ? (
        // AVIF — вже flatten-експорт повного кадру 780×1688 (2x 390×844):
        // crop-зсув не потрібен, просто заповнюємо контейнер.
        <img
          src={slide.media}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          src={slide.media}
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      )}

      {slide.hasOverlay && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: 'rgba(8,6,3,0.35)' }}
          aria-hidden="true"
        />
      )}

      {slide.hasTicketChip && (
        // top-[15.3%] = 129/844 (пропорційно до висоти кадру макета)
        <div className="pointer-events-none absolute left-6 top-[15.3%] z-10 bg-[#1a1a1a] px-3 py-1.5">
          <span className="font-body text-[15px] font-bold text-text-secondary">
            {t('onboarding.ticketChipLabel')}
          </span>
        </div>
      )}

      {/*
        Текстовий блок: заголовок (display 24px) + підзаголовок (body bold 15px).
        Якоримо ВЕРХОМ на top-[78.2%] (660/844), а не знизу — так заголовок
        сидить в одному місці на всіх слайдах незалежно від наявності підзаголовка
        (слайд 5 без підзаголовка не "спливає" вище і не наїжджає на відео-контент).
      */}
      <div className="pointer-events-none absolute inset-x-7 top-[78.2%] z-10 mx-auto flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-[24px] leading-none">
          {slide.titleLines.map((line, i) => (
            <span key={i} className="block">
              <TextParts parts={line} />
            </span>
          ))}
        </h2>
        {slide.subtitleParts && (
          <p
            className="font-body text-[15px] font-bold"
            style={{ maxWidth: slide.textMaxWidthPx ? `${slide.textMaxWidthPx}px` : undefined }}
          >
            <TextParts parts={slide.subtitleParts} />
          </p>
        )}
      </div>
    </div>
  )
}
