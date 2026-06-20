import type { FC } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import PredictionsPage from '../pages/PredictionsPage'
import WaitingPage from '../pages/WaitingPage'
import ResultsPage from '../pages/ResultsPage'
import GamePage from '../pages/GamePage'
import WelcomePage from '../pages/WelcomePage'
import TermsPage from '../pages/TermsPage'
import ProfilePage from '../pages/ProfilePage'

/** Маршрути застосунку під спільним AppLayout. */
export const AppRoutes: FC = () => {
  const location = useLocation()

  return (
    <Routes location={location}>
      <Route element={<AppLayout />}>
        <Route path="/" element={<PredictionsPage />} />
        <Route path="/waiting" element={<WaitingPage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Route>
      {/* окремий лайаут гри: без app-топбару, нижньої навігації та slide-переходів */}
      <Route path="/game/:id" element={<GamePage />} />
      {/* онбординг: окремі fullscreen-екрани поза AppLayout */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  )
}
