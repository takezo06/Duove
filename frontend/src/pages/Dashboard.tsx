import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { BentoGrid } from '../components/BentoGrid';

export function Dashboard() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 bg-[var(--color-bg)]/80 backdrop-blur-sm border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="text-neutral-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white font-semibold">Duove</span>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          <BentoGrid />
        </div>
      </main>
    </div>
  );
}
