import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  Loader2,
  User,
  Mail,
  Calendar,
  Camera,
  Check,
  X,
  Edit2,
} from 'lucide-react';

interface Profile {
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export function Profile() {
  usePageTitle('Profile');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setEmail(user.email || '');

        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setProfile(res.data);
        setDisplayName(res.data.display_name || '');
        setAvatarPreview(res.data.avatar_url || null);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Avatar upload error:', err);
      return null;
    }
  };

  const handleSave = async () => {
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const updateData: any = {};

      if (displayName !== profile?.display_name) {
        updateData.display_name = displayName;
      }

      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
          updateData.avatar_url = avatarUrl;
        } else {
          throw new Error('Failed to upload avatar');
        }
      }

      if (Object.keys(updateData).length === 0) {
        setSuccess('No changes to save.');
        setUpdating(false);
        return;
      }

      const res = await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/profile`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local profile state with the new data
      setProfile(res.data);
      setDisplayName(res.data.display_name || '');
      // Update avatar preview to the new URL
      if (res.data.avatar_url) {
        setAvatarPreview(res.data.avatar_url);
      } else {
        setAvatarPreview(null);
      }
      setSuccess('Profile updated successfully!');
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsEditingName(false);
      
      // Force sidebar to refresh (by dispatching a custom event or using a global state)
      // We'll use a simple method: reload user info in sidebar by triggering a re-fetch
      // This will be handled by the sidebar's own useEffect that listens to auth changes
      // but we can also manually trigger a re-fetch by calling the sidebar's fetch function.
      // For simplicity, we'll just reload the page? No, better to use a global state context.
      // We'll create a simple event listener: window.dispatchEvent(new Event('profile-updated'));
      window.dispatchEvent(new Event('profile-updated'));
      
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  const cancelEdit = () => {
    setDisplayName(profile?.display_name || '');
    setIsEditingName(false);
    setAvatarFile(null);
    setAvatarPreview(profile?.avatar_url || null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-neutral-800" />
          <div className="h-8 w-40 bg-neutral-800 rounded" />
        </div>
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-neutral-800" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-neutral-800 rounded" />
              <div className="h-4 w-48 bg-neutral-800 rounded" />
            </div>
          </div>
          <div className="h-px bg-neutral-800" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-neutral-800 rounded" />
              <div className="h-4 w-32 bg-neutral-800 rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-neutral-800 rounded" />
              <div className="h-4 w-48 bg-neutral-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-rose-400/10 flex items-center justify-center border border-rose-400/20">
          <User className="w-5 h-5 text-rose-400" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Your Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
        {/* Avatar */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-neutral-700 overflow-hidden flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-medium text-neutral-500">
                  {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 cursor-pointer flex items-center justify-center border-2 border-neutral-900 transition"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </label>
            <input
              ref={fileInputRef}
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 bg-neutral-800/50 text-sm text-white px-3 py-2 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
                  placeholder="Your display name"
                />
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-white truncate">
                  {profile?.display_name || 'User'}
                </span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-sm text-neutral-500">{profile?.avatar_url ? 'Has avatar' : 'No avatar'}</p>
          </div>
        </div>

        {/* User details */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-neutral-400">
            <Mail className="w-4 h-4 text-neutral-500" />
            <span>{email || 'email@example.com'}</span>
          </div>
          <div className="flex items-center gap-3 text-neutral-400">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <span>Joined {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-neutral-800/50">
          <button
            onClick={handleSave}
            disabled={updating || (!avatarFile && displayName === profile?.display_name)}
            className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {updating ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={cancelEdit}
            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-medium transition border border-neutral-700"
          >
            Cancel
          </button>
        </div>

        {/* Messages */}
        {error && <p className="text-rose-400 text-sm mt-4">{error}</p>}
        {success && <p className="text-emerald-400 text-sm mt-4">{success}</p>}
      </div>
    </div>
  );
}
