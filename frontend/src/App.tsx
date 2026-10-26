import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ProtectedLayout } from './layouts/ProtectedLayout';
import { Dashboard } from './pages/Dashboard';
import { Notifications } from './pages/Notifications';
import { Partner } from './pages/Partner';
import { Cravings } from './pages/Cravings';
import { Profile } from './pages/Profile';
import { QA } from './pages/QA';
import { QAHistory } from './pages/QAHistory';
import { CycleTracker } from './pages/CycleTracker';
import { LoveLetters} from './pages/LoveLetters'
import { AllLoveLetters } from './pages/AllLoveLetters';
import { NotFound } from './pages/NotFound';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { CookiePolicy } from './pages/CookiePolicy';
import { CookieConsent } from './components/CookieConsent';
//okay

function App() {
  return (
    <BrowserRouter>
      <CookieConsent />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* Public: readable signed in or out */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/cravings" element={<Cravings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/qa" element={<QA />} />
          <Route path="/qa/history" element={<QAHistory />} />
          <Route path="/cycle" element={<CycleTracker />} />
          {/* Logging and history live on the tracker now; old links still land there */}
          <Route path="/cycle/analytics" element={<Navigate to="/cycle" replace />} />
          <Route path="/cycle/log" element={<Navigate to="/cycle" replace />} />
          <Route path="/letters" element={<LoveLetters />} />
          <Route path="/letters/all" element={<AllLoveLetters />} />
          <Route path="*" element={<NotFound />} />
          {/* add other protected routes here */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
