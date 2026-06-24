import { useEffect, useRef, type FC } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { TermsActions } from '../components/onboarding/TermsActions'
import { useScrollToEnd } from '../hooks/useScrollToEnd'
import { useAuth } from '../hooks/useAuth'
import { termsParagraphs } from '../mocks/terms'
import { acceptTerms } from '../services/meApi'
import iconTimes from '../assets/icon-times.svg'

/**
 * Повноекранна угода `/terms`: шапка з заголовком і ✕, прокручуване тіло
 * з текстом EULA та панель дій. Кнопки залежать від прогресу прокрутки
 * (див. useScrollToEnd + TermsActions). Прийняття веде на `/profile`.
 * Якщо користувач вже прийняв умови — одразу редирект на головну.
 */
const TermsPage: FC = () => {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const bodyRef = useRef<HTMLDivElement>(null)
  const { atBottom, reachedEnd, scrollToBottom, scrollToTop } = useScrollToEnd(bodyRef)

  // Якщо умови вже прийнято — не показуємо цю сторінку
  if (user?.termsAccepted) {
    return <Navigate to="/" replace />
  }

  // Поява «Accept and Continue» зменшує висоту тіла на ~висоту кнопки, тож після
  // першого досягнення низу доскролюємо решту — користувач лишається в самому
  // кінці (кнопка-перемикач стає «Scroll top»).
  useEffect(() => {
    if (reachedEnd) {
      scrollToBottom()
    }
  }, [reachedEnd, scrollToBottom])

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-background">
      {/* Шапка: заголовок по центру + закриття. */}
      <header className="relative flex shrink-0 items-center justify-center border-b border-border-solid bg-background px-12 pb-4 pt-[calc(var(--app-safe-top)+1rem)]">
        <h1 className="font-body text-[15px] font-bold text-text-primary">
          End User License Agreement
        </h1>
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          aria-label="Close"
          className="absolute right-5 top-[calc(var(--app-safe-top)+1rem)] flex h-6 w-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <img src={iconTimes} alt="" aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>

      {/* Тіло: прокручуваний текст угоди. */}
      <div
        ref={bodyRef}
        className="scrollbar-hide flex-1 space-y-4 overflow-y-auto px-7 py-6 font-body text-[15px] text-text-secondary"
      >
        {termsParagraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {/* Панель дій. */}
      <div className="shrink-0 border-t border-border-dashed bg-surface px-8 py-4 pb-[calc(var(--app-safe-bottom)+1rem)]">
        <TermsActions
          atBottom={atBottom}
          reachedEnd={reachedEnd}
          onAccept={() => {
            // acceptTerms → refreshUser (оновлює termsAccepted у контексті) → /profile.
            // Якщо виникає помилка — логуємо і не переходимо (користувач може повторити).
            void (async () => {
              try {
                await acceptTerms();
                await refreshUser();
                navigate('/profile');
              } catch (err: unknown) {
                console.error('[TermsPage] acceptTerms or refreshUser failed:', err);
              }
            })();
          }}
          onScrollBottom={scrollToBottom}
          onScrollTop={scrollToTop}
        />
      </div>
    </div>
  )
}

export default TermsPage
