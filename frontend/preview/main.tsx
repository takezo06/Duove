// Mock preview entry: the real app (src/main.tsx) with supabase + backend faked, plus a scenario switcher.
import { createRoot } from 'react-dom/client';
import '../src/main';
import { scenario } from './mocks/data';

const scenarios = ['default', 'empty', 'unpaired'];

// Inline styles: Tailwind only scans src/, so utility classes here would not be generated
const bar = {
  position: 'fixed', bottom: 16, right: 16, zIndex: 300, display: 'flex', alignItems: 'center', gap: 4,
  padding: 4, borderRadius: 999, border: '1px solid #404040', background: 'rgba(23,23,23,.95)',
  font: '12px system-ui, sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,.4)',
} as const;
const link = (active: boolean) => ({
  padding: '4px 10px', borderRadius: 999, textDecoration: 'none',
  background: active ? '#404040' : 'transparent', color: active ? '#fff' : '#a3a3a3',
});

export function Switcher() {
  return (
    <div style={bar}>
      <span style={{ padding: '0 8px', color: '#737373' }}>Mock</span>
      {scenarios.map((s) => (
        <a key={s} href={`${location.pathname}?scenario=${s}`} style={link(s === scenario)}>
          {s}
        </a>
      ))}
    </div>
  );
}

const el = document.body.appendChild(document.createElement('div'));
createRoot(el).render(<Switcher />);
