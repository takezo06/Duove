import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
  LogOut,
  UserPlus,
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: CalendarDays, label: 'Cycle Tracker', path: '/cycle' },
  { icon: ListTodo, label: 'Cravings', path: '/cravings' },
  { icon: Mail, label: 'Love Letters', path: '/letters' },
  { icon: MessageCircleQuestion, label: 'Daily Q&A', path: '/qa' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: UserPlus, label: 'Partner', path: '/partner' },
];

const MIN_WIDTH = 64;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256;

export function Sidebar() {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('?');
  const [loadingUser, setLoadingUser] = useState(true);

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const lastExpandedWidth = useRef<number>(width);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const widthRef = useRef(width);

  const navigate = useNavigate();

  // Fetch user info (unchanged)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user:', error);
          setLoadingUser(false);
          return;
        }
        if (user) {
          const metadata = user.user_metadata || {};
          let displayName = 
            metadata.full_name || 
            metadata.name || 
            metadata.username || 
            user.email?.split('@')[0] || 
            'User';
          
          displayName = displayName
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          setUserName(displayName);
          setUserEmail(user.email || '');
          setUserAvatar(displayName.charAt(0).toUpperCase());
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  // Persist width
  useEffect(() => {
    localStorage.setItem('sidebar-width', String(width));
  }, [width]);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    if (!isCollapsed) {
      lastExpandedWidth.current = width;
    }
  }, [width, isCollapsed]);

  // Update widthRef on state change
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const currentWidth = isCollapsed ? MIN_WIDTH : width;
  const showText = currentWidth >= 120;

  // ---- Drag handlers with direct DOM manipulation ----
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = widthRef.current;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    if (sidebarRef.current) {
      // Disable transition for instant feedback
      sidebarRef.current.style.transition = 'none';
      sidebarRef.current.style.willChange = 'width';
    }
  };

  const handleMouseMove = (ev: MouseEvent) => {
    if (!isDragging.current) return;
    let newWidth = startWidth.current + (ev.clientX - startX.current);
    newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
    // Directly update the DOM
    if (sidebarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`;
    }
    // Update ref
    widthRef.current = newWidth;
    // If it expands beyond MIN_WIDTH, uncollapse
    if (newWidth > MIN_WIDTH && isCollapsed) {
      setIsCollapsed(false);
    }
    // If it reaches MIN_WIDTH, collapse
    if (newWidth === MIN_WIDTH && !isCollapsed) {
      setIsCollapsed(true);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (sidebarRef.current) {
      // Re-enable transition
      sidebarRef.current.style.transition = '';
      sidebarRef.current.style.willChange = '';
    }
    // Sync react state with final width
    const finalWidth = widthRef.current;
    setWidth(finalWidth);
    // Ensure collapse state matches
    if (finalWidth === MIN_WIDTH) {
      setIsCollapsed(true);
    } else if (finalWidth > MIN_WIDTH) {
      setIsCollapsed(false);
    }
  };

  const toggleCollapse = () => {
    if (isCollapsed) {
      const target = lastExpandedWidth.current >= 120 ? lastExpandedWidth.current : DEFAULT_WIDTH;
      setIsCollapsed(false);
      setWidth(target);
      widthRef.current = target;
    } else {
      lastExpandedWidth.current = width;
      setIsCollapsed(true);
      setWidth(MIN_WIDTH);
      widthRef.current = MIN_WIDTH;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Tooltip handlers
  const handleMouseEnter = useCallback((label: string, e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipText(label);
    setTooltipPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setTooltipVisible(true);
    }, 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setTooltipVisible(false);
  }, []);

  const shouldShowTooltips = isCollapsed || !showText;

  return (
    <div className="relative flex-shrink-0 h-screen">
      {/* Tooltip */}
      {tooltipVisible && shouldShowTooltips && (
        <div
          className="fixed px-3 py-1.5 bg-neutral-800 text-sm text-neutral-100 rounded-lg shadow-xl border border-neutral-700/70 pointer-events-none z-[200] whitespace-nowrap transition-opacity duration-200"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translateY(-50%)',
          }}
        >
          {tooltipText}
        </div>
      )}

      <aside
        ref={sidebarRef}
        className="flex flex-col h-full bg-neutral-900 border-r border-neutral-800 overflow-x-visible overflow-y-auto transition-all duration-300 ease-in-out"
        style={{ width: currentWidth }}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-5 border-b border-neutral-800/50 flex-shrink-0 overflow-x-hidden">
          <div className={`flex items-center gap-3 w-full ${!showText ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-lg bg-rose-400/10 flex items-center justify-center border border-rose-400/20 flex-shrink-0 transition-transform duration-300 ease-in-out hover:scale-105">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-400/20 transition-transform duration-300" />
            </div>
            <span
              className={`text-xl font-semibold text-white whitespace-nowrap transition-all duration-300 ease-in-out ${
                showText ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0'
              }`}
            >
              Duove
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ icon: Icon, label, path }) => (
            <a
              key={label}
              href={path}
              onMouseEnter={(e) => {
                if (shouldShowTooltips) handleMouseEnter(label, e);
              }}
              onMouseLeave={handleMouseLeave}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg 
                text-sm font-medium transition-all duration-200 
                text-neutral-400 hover:text-white hover:bg-neutral-700/50
                ${!showText ? 'justify-center' : ''}
                group relative
              `}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110`} />
              <span
                className={`whitespace-nowrap transition-all duration-300 ease-in-out ${
                  showText ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0'
                }`}
              >
                {label}
              </span>
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-neutral-800/50 p-3 flex flex-col gap-3 overflow-x-hidden">
          <div className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg 
            transition-all duration-200
            hover:bg-neutral-700/50
            ${!showText ? 'justify-center' : ''}
          `}>
            <div className="w-8 h-8 rounded-full bg-rose-400/20 flex items-center justify-center text-rose-400 text-sm font-medium flex-shrink-0 transition-transform duration-300 hover:scale-105">
              {loadingUser ? '...' : userAvatar}
            </div>
            <div className={`overflow-hidden min-w-0 transition-all duration-300 ease-in-out ${
              showText ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0'
            }`}>
              <p className="text-sm text-white font-medium truncate">
                {loadingUser ? 'Loading...' : userName || 'User'}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {loadingUser ? '' : userEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Collapse button */}
            <button
              onClick={toggleCollapse}
              className={`
                flex items-center justify-center
                w-9 h-9 rounded-lg 
                text-neutral-400 hover:text-white hover:bg-neutral-700/50
                transition-all duration-200
                ${!showText ? 'flex-1' : ''}
              `}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 transition-transform duration-300 hover:translate-x-0.5" />
              ) : (
                <ChevronLeft className="w-4 h-4 transition-transform duration-300 hover:-translate-x-0.5" />
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              onMouseEnter={(e) => {
                if (shouldShowTooltips) handleMouseEnter('Logout', e);
              }}
              onMouseLeave={handleMouseLeave}
              className={`
                flex items-center justify-center
                w-9 h-9 rounded-lg 
                text-neutral-400 hover:text-white hover:bg-neutral-700/50
                transition-all duration-200
                ${!showText ? 'flex-1' : ''}
              `}
            >
              <LogOut className="w-4 h-4 transition-transform duration-200 hover:scale-110" />
            </button>
          </div>
        </div>
      </aside>

      {/* Drag handle */}
      <div
        className="absolute top-0 right-0 w-2 h-full cursor-col-resize group transition-colors duration-200"
        onMouseDown={handleMouseDown}
      >
        <div className="w-full h-full bg-transparent group-hover:bg-rose-400/30 group-active:bg-rose-400/40 transition-colors duration-200 rounded-r-sm" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-0.5 h-8 bg-rose-400/40 rounded-full shadow-lg shadow-rose-400/20" />
        </div>
      </div>
    </div>
  );
}
