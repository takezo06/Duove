import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import {
  Loader2,
  Heart,
  Pizza,
  CheckCircle,
  Mail,
  MessageCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'craving_added' | 'craving_fulfilled' | 'letter_received' | 'qa_answered';
  message: string;
  created_at: string;
  link: string;
  reference_id: string;
}

function SkeletonNotification() {
  return (
    <div className="flex items-center gap-4 bg-neutral-900 rounded-2xl border border-neutral-800 p-4 animate-pulse cursor-pointer">
      <div className="w-10 h-10 rounded-full bg-neutral-700/50 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-neutral-700/50 rounded" />
        <div className="h-3 w-1/3 bg-neutral-700/50 rounded" />
      </div>
    </div>
  );
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return past.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function groupNotifications(notifications: Notification[]) {
  const groups: { [key: string]: Notification[] } = {};
  const today = new Date().toDateString();

  notifications.forEach((n) => {
    const date = new Date(n.created_at);
    let key = date.toDateString();
    if (key === today) key = 'Today';
    else if (key === new Date(Date.now() - 86400000).toDateString()) key = 'Yesterday';
    else key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
}

const notificationIcon = (type: string) => {
  switch (type) {
    case 'craving_added':
      return <Pizza className="w-5 h-5 text-amber-400" />;
    case 'craving_fulfilled':
      return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    case 'letter_received':
      return <Mail className="w-5 h-5 text-rose-400" />;
    case 'qa_answered':
      return <MessageCircle className="w-5 h-5 text-blue-400" />;
    default:
      return <Heart className="w-5 h-5 text-neutral-500" />;
  }
};

const notificationBg = (type: string) => {
  switch (type) {
    case 'craving_added':
      return 'bg-amber-400/10 border-amber-400/20';
    case 'craving_fulfilled':
      return 'bg-emerald-400/10 border-emerald-400/20';
    case 'letter_received':
      return 'bg-rose-400/10 border-rose-400/20';
    case 'qa_answered':
      return 'bg-blue-400/10 border-blue-400/20';
    default:
      return 'bg-neutral-800/50 border-neutral-700/50';
  }
};

export function Notifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const token = (await supabase.auth.getSession()).data.session?.access_token;

        // Fetch notifications
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/notifications`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotifications(res.data);

        // Mark as read after fetching
        if (token) {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/notifications/read`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // Notify sidebar to refresh badge
          window.dispatchEvent(new Event('notifications-read'));
        }
      } catch (err: any) {
        console.error('Error fetching notifications:', err);
        if (err.response?.status === 404) {
          setError('No active relationship found.');
        } else {
          setError('Failed to load notifications.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [navigate]);

  const handleNotificationClick = (notification: Notification) => {
    navigate(notification.link, { state: { highlightId: notification.reference_id } });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 animate-pulse" />
          <div className="h-8 w-40 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <p className="text-neutral-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-12 shadow-xl">
          <div className="w-16 h-16 bg-rose-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-400/20">
            <Sparkles className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">All caught up ✨</h2>
          <p className="text-neutral-400 max-w-md mx-auto">
            No notifications yet. We'll let you know when your partner does something sweet.
          </p>
        </div>
      </div>
    );
  }

  const grouped = groupNotifications(notifications);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-rose-400/10 flex items-center justify-center border border-rose-400/20">
          <Heart className="w-5 h-5 text-rose-400 fill-rose-400/20" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Notifications</h1>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                {date}
              </span>
              <div className="flex-1 h-px bg-neutral-800/50" />
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className="flex items-center gap-4 bg-neutral-900 rounded-2xl border border-neutral-800 p-4 hover:border-neutral-700 hover:bg-neutral-800/50 transition-all duration-200 cursor-pointer group"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border flex-shrink-0 ${notificationBg(
                      item.type
                    )}`}
                  >
                    {notificationIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-300">{item.message}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{timeAgo(item.created_at)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-rose-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
