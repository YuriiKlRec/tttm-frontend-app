import type { FC } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import OnboardingGate from '../components/auth/OnboardingGate'
import PredictionsPage from '../pages/PredictionsPage'
import WaitingPage from '../pages/WaitingPage'
import ResultsPage from '../pages/ResultsPage'
import GamePage from '../pages/GamePage'
import WelcomePage from '../pages/WelcomePage'
import TermsPage from '../pages/TermsPage'
import ProfilePage from '../pages/ProfilePage'
import BuyTicketsPage from '../pages/BuyTicketsPage'
import CreateGamePage from '../pages/CreateGamePage'

/** Маршрути застосунку під спільним AppLayout. */
export const AppRoutes: FC = () => {
  const location = useLocation()

  return (
    <Routes location={location}>
      {/* Онбординг: окремі fullscreen-екрани поза OnboardingGate */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/profile" element={<ProfilePage />} />

      {/* Захищені маршрути: OnboardingGate перевіряє ready + termsAccepted */}
      <Route element={<OnboardingGate />}>
        {/* Сторінки з AppLayout (топбар + нижня навігація + slide-переходи) */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<PredictionsPage />} />
          <Route path="/waiting" element={<WaitingPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Route>
        {/* Окремі fullscreen-маршрути без AppLayout, але за онбординг-ґейтом */}
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/buy" element={<BuyTicketsPage />} />
        <Route path="/create-game" element={<CreateGamePage />} />
      </Route>
    </Routes>
  )
}
