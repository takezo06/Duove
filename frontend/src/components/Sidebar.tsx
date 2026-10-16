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
  Heart,
  Bell,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const navGroups = [
  {
    label: null,
    items: [
      { icon: Home, label: 'Dashboard', path: '/' },
      { icon: Bell, label: 'Notifications', path: '/notifications' },
    ],
  },
  {
    label: 'Together',
    items: [
      { icon: MessageCircleQuestion, label: 'Daily Q&A', path: '/qa' },
      { icon: Mail, label: 'Love Letters', path: '/letters' },
      { icon: ListTodo, label: 'Cravings', path: '/cravings' },
      { icon: CalendarDays, label: 'Cycle Tracker', path: '/cycle' },
      { icon: Heart, label: 'Partner', path: '/partner' },
    ],
  },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900';

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
        const { data: profile } = await supabase
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
        `${import.meta.env.VITE_BACKEND_URL}/notifications/unread-count`,
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
    handleMouseLeave(); // the button under the cursor unmounts, so mouseleave never fires
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
      {tooltipVisible && (
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
        {/* Brand. Collapsed: the logo doubles as the expand button */}
        <div className={`flex items-center shrink-0 h-[72px] ${showText ? 'px-5 justify-between' : 'justify-center'}`}>
          {showText ? (
            <>
              <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
                <img src="/duove-logo.svg" alt="" className="w-8 h-8 object-contain" />
                <span className="text-xl font-bold text-white tracking-tight">Duove</span>
              </Link>
              {!isMobile && (
                <button
                  onClick={toggleCollapse}
                  aria-label="Collapse sidebar"
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition cursor-pointer ${focusRing}`}
                >
                  <PanelLeftClose className="w-[18px] h-[18px]" />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={toggleCollapse}
              disabled={isMobile}
              aria-label="Expand sidebar"
              onMouseEnter={(e) => !isMobile && handleMouseEnter('Expand sidebar', e)}
              onMouseLeave={handleMouseLeave}
              className={`group w-10 h-10 flex items-center justify-center rounded-xl hover:bg-neutral-800 disabled:hover:bg-transparent transition enabled:cursor-pointer ${focusRing}`}
            >
              <img src="/duove-logo.svg" alt="Duove" className={`w-8 h-8 object-contain ${isMobile ? '' : 'group-hover:hidden'}`} />
              {!isMobile && <PanelLeftOpen className="w-[18px] h-[18px] text-white hidden group-hover:block" />}
            </button>
          )}
        </div>

        <nav aria-label="Main" className={`flex-1 pb-4 overflow-y-auto overflow-x-hidden ${showText ? 'px-3' : 'px-2'}`}>
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-6' : ''}>
              {group.label &&
                (showText ? (
                  <p className="px-3 mb-2 text-xs font-medium text-neutral-500">{group.label}</p>
                ) : (
                  <div className="mx-auto mb-3 w-6 border-t border-neutral-800" aria-hidden />
                ))}
              <ul className="space-y-1">
                {group.items.map(({ icon: Icon, label, path }) => {
                  const active = isActive(path);
                  const badge = path === '/notifications' && unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;
                  return (
                    <li key={path}>
                      <Link
                        to={path}
                        aria-current={active ? 'page' : undefined}
                        aria-label={showText ? undefined : badge ? `${label}, ${badge} unread` : label}
                        onMouseEnter={(e) => shouldShowTooltips && handleMouseEnter(label, e)}
                        onMouseLeave={handleMouseLeave}
                        className={`flex items-center h-10 rounded-xl text-sm font-medium transition ${focusRing}
                          ${showText ? 'gap-3 px-3' : 'justify-center'}
                          ${active ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'}`}
                      >
                        <span className="relative shrink-0">
                          <Icon className={`w-5 h-5 ${active ? 'text-rose-400' : ''}`} aria-hidden />
                          {badge && !showText && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-neutral-900" aria-hidden />
                          )}
                        </span>
                        {showText && <span className="flex-1 truncate">{label}</span>}
                        {badge && showText && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-semibold flex items-center justify-center tabular-nums">
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account: card opens Profile, icon signs out */}
        <div className={`shrink-0 border-t border-neutral-800 p-3 flex gap-1 ${showText ? 'items-center' : 'flex-col items-center'}`}>
          <Link
            to="/profile"
            aria-current={isActive('/profile') ? 'page' : undefined}
            aria-label={showText ? undefined : `Profile, ${userName || 'you'}`}
            onMouseEnter={(e) => shouldShowTooltips && handleMouseEnter('Profile', e)}
            onMouseLeave={handleMouseLeave}
            className={`flex items-center rounded-xl transition ${focusRing}
              ${showText ? 'flex-1 min-w-0 gap-3 p-2' : 'p-1'}
              ${isActive('/profile') ? 'bg-neutral-800' : 'hover:bg-neutral-800/60'}`}
          >
            <span className="w-9 h-9 rounded-full bg-neutral-800 text-rose-400 flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden">
              {loadingUser ? null : profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                userAvatar
              )}
            </span>
            {showText && (
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white truncate">
                  {loadingUser ? 'Loading…' : userName || 'User'}
                </span>
                <span className="block text-xs text-neutral-400 truncate">{loadingUser ? '' : userEmail}</span>
              </span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            onMouseEnter={(e) => handleMouseEnter('Sign out', e)}
            onMouseLeave={handleMouseLeave}
            className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer ${focusRing}`}
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
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
