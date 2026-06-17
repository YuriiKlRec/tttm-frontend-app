import type { FC } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import PredictionsPage from '../pages/PredictionsPage'
import WaitingPage from '../pages/WaitingPage'
import ResultsPage from '../pages/ResultsPage'

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
    </Routes>
  )
}
