import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
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
import { CycleAnalytics } from './pages/CycleAnalytics';
import { CycleLog } from './pages/CycleLog';
import { LoveLetters} from './pages/LoveLetters'
import { AllLoveLetters } from './pages/AllLoveLetters';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/cravings" element={<Cravings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/qa" element={<QA />} />
          <Route path="/qa/history" element={<QAHistory />} />
          <Route path="/cycle" element={<CycleTracker />} />
          <Route path="/cycle/analytics" element={<CycleAnalytics />} />
          <Route path="/cycle/log" element={<CycleLog />} />
          <Route path="/letters" element={<LoveLetters />} />
          <Route path="/letters/all" element={<AllLoveLetters />} />
          {/* add other protected routes here */}
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
