import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OnboardingPage from '../OnboardingPage'
import { trackEvent } from '../../services/analytics'

vi.mock('../../services/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('../../services/token-storage', () => ({ getStoredTgUserId: () => 'tg-42' }))
vi.mock('../../i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { termsAccepted: true, id: 'u1' }, ready: true }),
}))

let capturedOnFinish: (() => void) | null = null
vi.mock('../../hooks/useStoryPlayer', () => ({
  useStoryPlayer: (opts: { onFinish: () => void }) => {
    capturedOnFinish = opts.onFinish
    return { index: 0, progress: 0, paused: false, goNext: vi.fn(), goPrev: vi.fn(), pause: vi.fn(), resume: vi.fn() }
  },
}))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

const renderPage = (): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  )

describe('OnboardingPage — аналітика онбордингу', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnFinish = null
  })

  it('шле onboarding_started один раз при показі 1-го слайда', () => {
    const { rerender } = renderPage()
    expect(trackEvent).toHaveBeenCalledWith('onboarding_started', { telegram_user_id: 'tg-42' })
    expect(vi.mocked(trackEvent).mock.calls.filter((c) => c[0] === 'onboarding_started')).toHaveLength(1)

    rerender(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    )
    expect(vi.mocked(trackEvent).mock.calls.filter((c) => c[0] === 'onboarding_started')).toHaveLength(1)
  })

  it('шле onboarding_skipped зі screen_number=1 при кліку на Skip', () => {
    renderPage()
    const skipLink = screen.getByText('onboarding.skipLink')
    fireEvent.click(skipLink)

    expect(trackEvent).toHaveBeenCalledWith('onboarding_skipped', {
      telegram_user_id: 'tg-42',
      screen_number: 1,
    })
  })

  it('шле onboarding_finished з duration_sec на завершенні онбордингу', () => {
    vi.useFakeTimers()
    const start = Date.UTC(2026, 6, 21, 12, 0, 0)
    vi.setSystemTime(start)

    renderPage()
    vi.setSystemTime(start + 12_000)

    expect(capturedOnFinish).not.toBeNull()
    capturedOnFinish?.()

    expect(trackEvent).toHaveBeenCalledWith('onboarding_finished', {
      telegram_user_id: 'tg-42',
      duration_sec: 12,
    })
    expect(navigateMock).toHaveBeenCalledWith('/edit-profile', { state: { from: 'onboarding' } })

    vi.useRealTimers()
  })
})
