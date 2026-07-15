import step1Guess from '../assets/onboarding/step-1-guess.avif'
import step2Bank from '../assets/onboarding/step-2-bank.avif'
import step3Secure from '../assets/onboarding/step-3-secure.avif'
import step4Ticket from '../assets/onboarding/step-4-ticket.mp4'
import step5Track from '../assets/onboarding/step-5-track.mp4'
import step6Cta from '../assets/onboarding/step-6-cta.avif'

/** Колір фрагмента тексту заголовка/підзаголовка (токени Figma text/*). */
export type OnboardingTextColor = 'primary' | 'secondary' | 'accent'

/** Фрагмент тексту заголовка/підзаголовка: ключ i18n + колір рендера. */
export interface OnboardingTextPart {
  key: string
  color: OnboardingTextColor
}

/**
 * Рядок заголовка: масив кольорових частин. Розбивка на рядки фіксована за
 * макетом (не natural wrap) — кожен рядок рендериться окремим `block`-елементом.
 */
export type OnboardingTitleLine = OnboardingTextPart[]

/** Конфіг одного слайда онбордингу. */
export interface OnboardingSlide {
  /** Унікальний ключ слайда (React key, дебаг). */
  id: string
  /** Тип фонового медіа. */
  mediaType: 'image' | 'video'
  /** Імпортований шлях до асета. */
  media: string
  /** Тривалість показу слайда, мс — визначає крок автопереходу і синхронізацію степера. */
  durationMs: number
  /** Темний overlay rgba(8,6,3,0.35) поверх відео (слайди 4/5). */
  hasOverlay: boolean
  /** Чи показувати лінк "Skip onboarding" (слайд 1). */
  hasSkipLink: boolean
  /** Чи показувати лінк "Terms of use" (слайд 3). */
  hasTermsLink: boolean
  /** Чи показувати чіп-мітку "The Ticket" (слайд 4). */
  hasTicketChip: boolean
  /** Заголовок (display, 24px): рядки з фіксованою розбивкою за макетом. */
  titleLines: OnboardingTitleLine[]
  /** Фрагменти підзаголовка (body bold, 15px) — не на всіх слайдах, natural wrap. */
  subtitleParts?: OnboardingTextPart[]
  /**
   * Максимальна ширина ПІДЗАГОЛОВКА в px (за спекою) — форсує natural wrap
   * довгого речення. На заголовок не діє: його рядки вже розбиті вручну.
   */
  textMaxWidthPx?: number
}

/** Клас кольору тексту за токеном Figma. */
export const ONBOARDING_TEXT_COLOR_CLASS: Record<OnboardingTextColor, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  accent: 'text-text-focus',
}

/** Конфіг 6 слайдів онбордингу — медіа, тривалості, тексти й overlay-прапорці. */
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'guess',
    mediaType: 'image',
    media: step1Guess,
    durationMs: 5000,
    hasOverlay: false,
    hasSkipLink: true,
    hasTermsLink: false,
    hasTicketChip: false,
    titleLines: [
      [{ key: 'onboarding.s1Line1', color: 'primary' }],
      [
        { key: 'onboarding.s1Line2Start', color: 'primary' },
        { key: 'onboarding.s1Line2Accent', color: 'accent' },
      ],
      [{ key: 'onboarding.s1Line3', color: 'accent' }],
    ],
  },
  {
    id: 'bank',
    mediaType: 'image',
    media: step2Bank,
    durationMs: 5000,
    hasOverlay: false,
    hasSkipLink: false,
    hasTermsLink: false,
    hasTicketChip: false,
    titleLines: [
      [{ key: 'onboarding.s2Line1', color: 'primary' }],
      [
        { key: 'onboarding.s2Line2Start', color: 'primary' },
        { key: 'onboarding.s2Line2Accent', color: 'accent' },
      ],
    ],
    subtitleParts: [{ key: 'onboarding.s2Subtitle', color: 'primary' }],
    textMaxWidthPx: 270,
  },
  {
    id: 'secure',
    mediaType: 'image',
    media: step3Secure,
    durationMs: 5000,
    hasOverlay: false,
    hasSkipLink: false,
    hasTermsLink: true,
    hasTicketChip: false,
    titleLines: [[{ key: 'onboarding.s3Title', color: 'accent' }]],
    subtitleParts: [{ key: 'onboarding.s3Subtitle', color: 'primary' }],
    textMaxWidthPx: 270,
  },
  {
    id: 'ticket',
    mediaType: 'video',
    media: step4Ticket,
    durationMs: 17000,
    hasOverlay: true,
    hasSkipLink: false,
    hasTermsLink: false,
    hasTicketChip: true,
    titleLines: [
      [{ key: 'onboarding.s4Line1', color: 'primary' }],
      [{ key: 'onboarding.s4Line2', color: 'accent' }],
    ],
    subtitleParts: [
      { key: 'onboarding.s4SubtitleSecondary', color: 'secondary' },
      { key: 'onboarding.s4SubtitlePrimary', color: 'primary' },
    ],
    textMaxWidthPx: 270,
  },
  {
    id: 'track',
    mediaType: 'video',
    media: step5Track,
    durationMs: 14000,
    hasOverlay: true,
    hasSkipLink: false,
    hasTermsLink: false,
    hasTicketChip: false,
    titleLines: [
      [{ key: 'onboarding.s5Line1', color: 'primary' }],
      [{ key: 'onboarding.s5Line2', color: 'primary' }],
    ],
  },
  {
    id: 'cta',
    mediaType: 'image',
    media: step6Cta,
    durationMs: 5000,
    hasOverlay: false,
    hasSkipLink: false,
    hasTermsLink: false,
    hasTicketChip: false,
    titleLines: [
      [{ key: 'onboarding.s6Line1', color: 'primary' }],
      [{ key: 'onboarding.s6Line2', color: 'primary' }],
      [{ key: 'onboarding.s6Line3', color: 'accent' }],
    ],
  },
]

/** Тривалості слайдів (мс) — окремий масив для передачі у useStoryPlayer. */
export const ONBOARDING_SLIDE_DURATIONS: number[] = ONBOARDING_SLIDES.map((slide) => slide.durationMs)
