import { BrowserRouter, Routes, Route } from 'react-router-dom';
import OnboardingApp from './App';
import PublicBooking from './pages/PublicBooking';
import ProfessionalBookingPage from './pages/ProfessionalBookingPage';
import ExamplePage from './pages/ExamplePage';
import LandingPage from './pages/LandingPage';

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/p/:slug" element={<ProfessionalBookingPage />} />
        <Route path="/booking/:slug" element={<PublicBooking />} />
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
