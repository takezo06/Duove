import { Sidebar } from '../components/Sidebar';
import { BentoGrid } from '../components/BentoGrid';

export function Dashboard() {
  return (
    <div className="flex h-screen bg-neutral-950">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <BentoGrid />
      </main>
    </div>
  );
}
