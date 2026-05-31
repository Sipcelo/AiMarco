import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import OnboardingApp from './App';
import PublicBooking from './pages/PublicBooking';
import ProfessionalBookingPage from './pages/ProfessionalBookingPage';
import ExamplePage from './pages/ExamplePage';
import LandingPage from './pages/LandingPage';

// Rota legada de booking: redireciona para a rota pública oficial /p/:slug,
// preservando o slug. Mantém links antigos funcionando sem duplicar a UI de booking.
function LegacyBookingRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/p/${slug ?? ''}`} replace />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/p/:slug" element={<ProfessionalBookingPage />} />
        <Route path="/booking/:slug" element={<LegacyBookingRedirect />} />
        <Route path="/example" element={<ExamplePage />} />
        <Route path="/example-m" element={<PublicBooking />} />
        <Route path="/example-s" element={<PublicBooking />} />
        <Route path="/example-S" element={<PublicBooking />} />
        <Route path="/onboarding" element={<OnboardingApp />} />
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
