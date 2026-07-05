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

  // User state
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

  const navigate = useNavigate();

  // Fetch user info
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
          // Determine display name
          const metadata = user.user_metadata || {};
          let displayName = 
            metadata.full_name || 
            metadata.name || 
            metadata.username || 
            user.email?.split('@')[0] || 
            'User';
          
          // Capitalize first letter of each word for nice display
          displayName = displayName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          setUserName(displayName);
          setUserEmail(user.email || '');
          setUserAvatar(displayName.charAt(0).toUpperCase());
        } else {
          setUserName('User');
          setUserEmail('user@example.com');
          setUserAvatar('U');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setUserName('User');
        setUserEmail('user@example.com');
        setUserAvatar('U');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  // Persist width and collapse state
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

  const currentWidth = isCollapsed ? MIN_WIDTH : width;
  const showText = currentWidth >= 120;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = isCollapsed ? MIN_WIDTH : width;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (ev: MouseEvent) => {
    if (!isDragging.current) return;
    let newWidth = startWidth.current + (ev.clientX - startX.current);
    newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
    if (isCollapsed && newWidth > MIN_WIDTH) {
      setIsCollapsed(false);
    }
    setWidth(newWidth);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const toggleCollapse = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setWidth(lastExpandedWidth.current >= 120 ? lastExpandedWidth.current : DEFAULT_WIDTH);
    } else {
      lastExpandedWidth.current = width;
      setIsCollapsed(true);
      setWidth(MIN_WIDTH);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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
        className="flex flex-col h-full bg-neutral-900 border-r border-neutral-800 overflow-x-visible overflow-y-auto"
        style={{ width: currentWidth }}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-5 border-b border-neutral-800/50 flex-shrink-0 overflow-x-hidden">
          <div className={`flex items-center gap-3 w-full ${!showText ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-lg bg-rose-400/10 flex items-center justify-center border border-rose-400/20 flex-shrink-0">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-400/20" />
            </div>
            {showText && (
              <span className="text-xl font-semibold text-white whitespace-nowrap">
                Duove
              </span>
            )}
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
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {showText && <span>{label}</span>}
            </a>
          ))}
        </nav>

        {/* Footer – dynamic user info */}
        <div className="border-t border-neutral-800/50 p-3 flex flex-col gap-3 overflow-x-hidden">
          <div className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg 
            transition-all duration-200
            hover:bg-neutral-700/50
            ${!showText ? 'justify-center' : ''}
          `}>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-rose-400/20 flex items-center justify-center text-rose-400 text-sm font-medium flex-shrink-0">
              {loadingUser ? '...' : userAvatar}
            </div>
            {showText && (
              <div className="overflow-hidden min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {loadingUser ? 'Loading...' : userName || 'User'}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {loadingUser ? '' : userEmail}
                </p>
              </div>
            )}
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
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
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
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Drag handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-rose-400/30 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
