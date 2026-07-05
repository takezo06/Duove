import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export function ProtectedLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
