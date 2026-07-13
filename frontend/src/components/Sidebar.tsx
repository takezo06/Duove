import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
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
const MOBILE_BREAKPOINT = 768;

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('?');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const lastExpandedWidth = useRef<number>(width);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const widthRef = useRef(width);

  // ---- Mobile detection ----
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
        setWidth(MIN_WIDTH);
        widthRef.current = MIN_WIDTH;
      } else {
        const savedCollapsed = localStorage.getItem('sidebar-collapsed');
        const savedWidth = localStorage.getItem('sidebar-width');
        if (savedCollapsed !== null) setIsCollapsed(savedCollapsed === 'true');
        if (savedWidth) setWidth(parseInt(savedWidth, 10));
        else setWidth(DEFAULT_WIDTH);
        widthRef.current = width;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---- User info ----
  const fetchUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        setLoadingUser(false);
        return;
      }
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        let displayName = 'User';
        let avatarUrl = null;

        if (profile) {
          if (profile.display_name) displayName = profile.display_name;
          if (profile.avatar_url) avatarUrl = profile.avatar_url;
        } else {
          const meta = user.user_metadata || {};
          displayName = meta.full_name || meta.name || meta.username || user.email?.split('@')[0] || 'User';
        }

        displayName = displayName
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

        setUserName(displayName);
        setUserEmail(user.email || '');
        setUserAvatar(displayName.charAt(0).toUpperCase());
        setProfileAvatarUrl(avatarUrl);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchUser();
    const handleProfileUpdate = () => fetchUser();
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  // ---- Unread count ----
  const fetchUnreadCount = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/notifications/unread-count`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const handleNotificationsRead = () => fetchUnreadCount();
    window.addEventListener('notifications-read', handleNotificationsRead);
    return () => window.removeEventListener('notifications-read', handleNotificationsRead);
  }, []);

  // ---- Persist width/collapse ----
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebar-width', String(width));
      localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }
  }, [width, isCollapsed, isMobile]);

  useEffect(() => {
    if (!isCollapsed) {
      lastExpandedWidth.current = width;
    }
  }, [width, isCollapsed]);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const currentWidth = isCollapsed ? MIN_WIDTH : width;
  const showText = currentWidth >= 120;

  // ---- Drag handlers (disabled on mobile) ----
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = widthRef.current;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    if (sidebarRef.current) {
      sidebarRef.current.style.transition = 'none';
      sidebarRef.current.style.willChange = 'width';
    }
  };

  const handleMouseMove = (ev: MouseEvent) => {
    if (!isDragging.current) return;
    let newWidth = startWidth.current + (ev.clientX - startX.current);
    newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
    if (sidebarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`;
    }
    widthRef.current = newWidth;
    if (newWidth > MIN_WIDTH && isCollapsed) {
      setIsCollapsed(false);
    }
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
      sidebarRef.current.style.transition = '';
      sidebarRef.current.style.willChange = '';
    }
    const finalWidth = widthRef.current;
    setWidth(finalWidth);
    if (finalWidth === MIN_WIDTH) setIsCollapsed(true);
    else if (finalWidth > MIN_WIDTH) setIsCollapsed(false);
  };

  const toggleCollapse = () => {
    if (isMobile) return;
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

  // ---- Tooltip handlers ----
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

  // ---- Active state ----
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="relative flex-shrink-0 h-screen select-none">
      {/* Tooltip Overlay */}
      {tooltipVisible && shouldShowTooltips && (
        <div
          className="fixed px-3 py-1.5 bg-neutral-800 text-sm text-neutral-100 rounded-lg shadow-xl border border-neutral-700/70 pointer-events-none z-[200] whitespace-nowrap"
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
        className="flex flex-col h-full bg-neutral-900 border-r border-neutral-800 overflow-x-hidden overflow-y-auto transition-all duration-300 ease-in-out"
        style={{ width: currentWidth }}
      >
        {/* Logo Block Frame */}
        <div className="flex items-center h-16 px-4 border-b border-neutral-800/50 flex-shrink-0 overflow-hidden">
          <div className={`flex items-center w-full ${!showText ? 'justify-center' : 'justify-start gap-3'}`}>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 flex-shrink-0 transition-transform duration-300 hover:scale-105">
              <img
                src="/duove-logo.svg"
                alt="Duove"
                className="w-5 h-5 object-contain"
              />
            </div>
            {!isCollapsed && showText && (
              <span className="text-lg font-bold text-white tracking-wide animate-fade-in">
                Duove
              </span>
            )}
          </div>
        </div>

        {/* Primary Route Lists View Matrix */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            const isBell = label === 'Notifications';
            return (
              <Link
                key={label}
                to={path}
                onMouseEnter={(e) => {
                  if (shouldShowTooltips) handleMouseEnter(label, e);
                }}
                onMouseLeave={handleMouseLeave}
                className={`
                  flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative
                  ${!showText ? 'justify-center p-3' : 'justify-start gap-3 px-4 py-3'}
                  ${active 
                    ? 'bg-neutral-800 border-l-2 border-rose-500 text-rose-400 font-semibold shadow-inner' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }
                `}
              >
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 transition-all duration-200 ${active ? 'text-rose-400 scale-105' : 'group-hover:scale-105'}`} />
                  {isBell && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-rose-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold border border-neutral-900">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                
                {!isCollapsed && showText && (
                  <span className="whitespace-nowrap truncate animate-fade-in">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Control Tray Footer Area */}
        <div className="border-t border-neutral-800/50 p-3 flex flex-col gap-2 overflow-x-hidden bg-neutral-900/40">
          <div
            className={`
              flex items-center rounded-xl transition-all duration-200 p-2
              ${!showText ? 'justify-center bg-transparent' : 'justify-start gap-3 bg-transparent hover:bg-neutral-800/50'}
            `}
          >
            <div className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center text-sm font-semibold flex-shrink-0 shadow-inner overflow-hidden">
              {loadingUser ? (
                <span className="text-xs opacity-50">...</span>
              ) : profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userAvatar
              )}
            </div>
            {!isCollapsed && showText && (
              <div className="min-w-0 flex-1 animate-fade-in">
                <p className="text-sm text-white font-medium truncate">
                  {loadingUser ? 'Loading...' : userName || 'User'}
                </p>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {loadingUser ? '' : userEmail}
                </p>
              </div>
            )}
          </div>

          {/* Controls Trigger Bar Matrix */}
          <div className={`flex ${!showText ? 'flex-col items-center gap-2 mt-1' : 'items-center justify-between px-1 pt-1'}`}>
            {!isMobile && (
              <button
                onClick={toggleCollapse}
                className={`
                  flex items-center justify-center w-9 h-9 rounded-xl
                  text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-150 focus:outline-none
                `}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 transition-transform hover:translate-x-0.5" />
                ) : (
                  <ChevronLeft className="w-4 h-4 transition-transform hover:-translate-x-0.5" />
                )}
              </button>
            )}

            <button
              onClick={handleLogout}
              onMouseEnter={(e) => {
                if (shouldShowTooltips) handleMouseEnter('Logout', e);
              }}
              onMouseLeave={handleMouseLeave}
              className={`
                flex items-center justify-center w-9 h-9 rounded-xl
                text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-all duration-150 focus:outline-none
              `}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 transition-transform hover:scale-105" />
            </button>
          </div>
        </div>
      </aside>

      {/* Resize Drag Element strip */}
      {!isMobile && (
        <div
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize group transition-colors duration-200 z-50"
          onMouseDown={handleMouseDown}
        >
          <div className="w-full h-full bg-transparent group-hover:bg-rose-500/20 group-active:bg-rose-500/40 transition-colors duration-200" />
        </div>
      )}
    </div>
  );
}
