import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { Heart } from 'lucide-react';

const LOADING_MESSAGES = [
  "Securing your space...",
  "Syncing your timeline...",
  "Unwrapping love letters...",
  "Checking the cravings board..."
];

export function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle through contextual catchy sub-messages while loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [loading]);

  // Premium, immersive full-screen pulse loader
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-950 overflow-hidden relative">
        {/* Soft Ambient Background Radial Glow */}
        <div className="absolute w-[350px] h-[350px] bg-rose-500/10 blur-[80px] rounded-full animate-pulse duration-[3000ms]" />

        <div className="relative flex flex-col items-center gap-6 z-10">
          {/* Logo Container with Layered Pulsing Rings */}
          <div className="relative group">
            {/* Outer Echo Ring */}
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-md scale-110 animate-ping opacity-40 duration-1000" />
            
            {/* Inner Glow Base */}
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/20 to-orange-500/10 rounded-3xl blur-xl" />
            
            {/* Core Logo Frame */}
            <div className="relative w-24 h-24 bg-neutral-900 border border-neutral-800 rounded-3xl flex items-center justify-center shadow-2xl animate-pulse duration-[1500ms]">
              <img 
                src="/duove-logo.svg" 
                alt="Duove Logo" 
                className="w-14 h-14 object-contain"
                onError={(e) => {
                  // Elegant visual fallback if SVG paths are missing or misconfigured
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <Heart className="fallback-icon hidden w-10 h-10 text-rose-400 fill-rose-400/10" />
            </div>
          </div>

          {/* Typography Matrix */}
          <div className="flex flex-col items-center text-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-wider bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Duove
            </h2>
            
            {/* Micro-Interaction Carousel Message */}
            <div className="h-5 overflow-hidden">
              <p className="text-sm font-medium text-neutral-400 transition-all duration-500 transform translate-y-0 animate-fade-in key={messageIndex}">
                {LOADING_MESSAGES[messageIndex]}
              </p>
            </div>
          </div>
        </div>

        {/* Minimal Progress Line Indicator */}
        <div className="absolute bottom-12 w-32 h-[3px] bg-neutral-900 rounded-full overflow-hidden border border-neutral-900">
          <div className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full animate-infinite-loading" />
        </div>
      </div>
    );
  }

  // Not logged in → instantly redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in → show the app
  return (
    <div className="flex h-screen bg-neutral-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
