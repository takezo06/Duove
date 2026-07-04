import { useState, useEffect } from 'react';
import {
  Home,
  CalendarDays,
  ListTodo,
  Mail,
  MessageCircleQuestion,
  User,
  Heart,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: CalendarDays, label: 'Cycle Tracker', path: '/cycle' },
  { icon: ListTodo, label: 'Remarks', path: '/remarks' },
  { icon: Mail, label: 'Love Letters', path: '/letters' },
  { icon: MessageCircleQuestion, label: 'Daily Q&A', path: '/qa' },
  { icon: User, label: 'Profile', path: '/profile' },
];

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sidebarClass = `
    sidebar 
    ${isCollapsed && !isMobile ? 'sidebar-collapsed' : ''} 
    ${isMobile ? 'sidebar-mobile' : ''} 
    ${isMobile && isMobileOpen ? 'open' : ''}
  `;

  return (
    <>
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <aside className={sidebarClass}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-400/20" />
            </div>
            <span className="sidebar-logo-text">Duove</span>
          </div>
          {isMobile && (
            <button onClick={() => setIsMobileOpen(false)} className="text-neutral-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ icon: Icon, label, path }) => (
            <a
              key={label}
              href={path}
              className={`sidebar-nav-link ${window.location.pathname === path ? 'active' : ''}`}
            >
              <Icon className="icon" />
              <span className="label">{label}</span>
              <span className="tooltip">{label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          {(!isCollapsed || isMobile) && (
            <div className="sidebar-user">
              <div className="avatar">J</div>
              <div className="info">
                <div className="name">Jed</div>
                <div className="email">jed@duove.app</div>
              </div>
            </div>
          )}
          {!isMobile && (
            <button
              className="sidebar-toggle"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
