import { useCallback, useRef, type FC, type KeyboardEvent, type PointerEvent, type SyntheticEvent } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { OnboardingSlide } from '../components/onboarding/OnboardingSlide'
import { OnboardingStepper } from '../components/onboarding/OnboardingStepper'
import { useStoryPlayer } from '../hooks/useStoryPlayer'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n/useT'
import { ONBOARDING_SLIDES, ONBOARDING_SLIDE_DURATIONS } from '../constants/onboardingSlides'

/** Тап у лівих/правих 33%/67% контейнера — навігація по слайдах, центр — нічого. */
const LEFT_ZONE_RATIO = 0.33
const RIGHT_ZONE_RATIO = 0.67
/** Поріг утримання (мс): менше — тап-навігація, більше — лише пауза автоплею. */
const HOLD_THRESHOLD_MS = 250

/**
 * Fullscreen stories-онбординг `/onboarding`: 6 слайдів з автопереходом,
 * тап-жестами (лівий край/правий край/утримання) і степером зверху.
 * Доступний лише після прийняття угоди (інакше — редирект на `/welcome`,
 * як в OnboardingGate). Завершення (останній слайд, тап праворуч на ньому,
 * або "Skip onboarding") веде на `/edit-profile` зі збереженням ланцюжка кроку.
 *
 * Захист від передчасного редиректу при прямому завантаженні `/onboarding`:
 * поки авторизація ще вантажиться (`!ready`), user завжди `null` — без
 * перевірки на ready guard нижче спрацював би і кинув користувача на
 * `/welcome` ще до того, як user встиг підвантажитись. Тому рендеримо
 * порожній fullscreen-заглушку (без тексту, щоб не блимати) до ready=true.
 */
const OnboardingPage: FC = () => {
  const { user, ready } = useAuth()
  const { t } = useT()
  const navigate = useNavigate()

  // Всі хуки — безумовно, до умовного return нижче (правило хуків)
  const handleFinish = useCallback((): void => {
    navigate('/edit-profile', { state: { from: 'onboarding' } })
  }, [navigate])

  const { index, progress, paused, goNext, goPrev, pause, resume } = useStoryPlayer({
    slideCount: ONBOARDING_SLIDES.length,
    durations: ONBOARDING_SLIDE_DURATIONS,
    onFinish: handleFinish,
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const pointerDownRef = useRef<{ x: number; time: number } | null>(null)

  // Авторизація ще вантажиться — не приймаємо рішень про редирект, чекаємо ready
  if (!ready) {
    return <div className="h-[100dvh] bg-background" />
  }

  // Умови ще не прийнято — онбординг недоступний (той самий патерн, що в OnboardingGate/WelcomePage)
  if (!user?.termsAccepted) {
    return <Navigate to="/welcome" replace />
  }

  const currentSlide = ONBOARDING_SLIDES[index]

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    pointerDownRef.current = { x: e.clientX, time: Date.now() }
    pause()
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    const down = pointerDownRef.current
    pointerDownRef.current = null
    resume()
    if (!down || Date.now() - down.time >= HOLD_THRESHOLD_MS) return // утримання — не тап

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const ratio = (e.clientX - rect.left) / rect.width
    if (ratio < LEFT_ZONE_RATIO) goPrev()
    else if (ratio > RIGHT_ZONE_RATIO) goNext()
  }

  const handlePointerCancel = (): void => {
    pointerDownRef.current = null
    resume()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNext()
    }
  }

  // Клік/поінтер по лінках не має тригерити тап-навігацію контейнера
  const stopLinkPropagation = (e: SyntheticEvent): void => e.stopPropagation()
  const linkClass =
    'font-mono text-[14px] font-bold text-text-secondary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-[100dvh] max-w-[430px] touch-none overflow-hidden bg-background outline-none"
      role="group"
      aria-roledescription="story"
      aria-label={t('onboarding.storyAriaLabel', { current: index + 1, total: ONBOARDING_SLIDES.length })}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      {/* Трек слайдів: сусідні слайди відрендерені — плавний slide дає сам transform. */}
      <div
        className="flex h-full"
        style={{ transform: `translateX(-${index * 100}%)`, transition: 'transform 350ms ease-out' }}
      >
        {ONBOARDING_SLIDES.map((slide, i) => (
          <OnboardingSlide key={slide.id} slide={slide} active={i === index} paused={paused} />
        ))}
      </div>

      <div className="absolute inset-x-7 top-[calc(var(--app-safe-top)+22px)] z-20" aria-hidden="true">
        <OnboardingStepper total={ONBOARDING_SLIDES.length} current={index} progress={progress} />
      </div>

      {(currentSlide.hasSkipLink || currentSlide.hasTermsLink) && (
        <div className="absolute inset-x-0 bottom-[calc(var(--app-safe-bottom)+48px)] z-20 flex justify-center">
          {currentSlide.hasSkipLink && (
            <Link
              to="/edit-profile"
              state={{ from: 'onboarding' }}
              onPointerDown={stopLinkPropagation}
              onClick={stopLinkPropagation}
              className={linkClass}
            >
              {t('onboarding.skipLink')}
            </Link>
          )}
          {currentSlide.hasTermsLink && (
            <Link to="/terms?view=1" onPointerDown={stopLinkPropagation} onClick={stopLinkPropagation} className={linkClass}>
              {t('onboarding.termsLink')}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default OnboardingPage
