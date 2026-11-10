import React, { useState, useEffect } from 'react';
import {
  Crown,
  Users,
  MessageSquare,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  Server,
  Bell,
  Image as ImageIcon,
  Video,
  Lock,
  Check,
  X,
  Trash2,
  Plus,
  Eye,
  Upload,
  Search,
  AlertTriangle,
  UserCheck,
  UserX,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useBanners } from '../../context/BannerContext';
import { FeedbackItem, KeyHealthStats, CelebrationBanner, NotificationHistoryItem } from '../../types';

interface OwnerUserRecord {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  isRegistered: boolean;
  isRestricted: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export const OwnerDashboard: React.FC = () => {
  const { user, isOwner } = useAuth();
  const { banners, saveBanner, deleteBanner } = useBanners();
  const { notificationHistory, fetchNotificationHistory, sendVerifiedNotification } = useNotifications();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'banners' | 'notifications' | 'keys' | 'feedback'>('overview');

  // Registered Users state
  const [usersList, setUsersList] = useState<OwnerUserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserDetails, setSelectedUserDetails] = useState<OwnerUserRecord | null>(null);
  const [restrictingId, setRestrictingId] = useState<string | null>(null);

  // Notification Composer state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifAudience, setNotifAudience] = useState<'all' | 'specific'>('all');
  const [notifRecipientEmail, setNotifRecipientEmail] = useState('');
  const [notifSendStatus, setNotifSendStatus] = useState<'idle' | 'Sending...' | 'Successfully Sent' | 'Failed to Send'>('idle');
  const [notifStatusMessage, setNotifStatusMessage] = useState<string | null>(null);

  // Banner Management state
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDesc, setBannerDesc] = useState('');
  const [bannerMediaType, setBannerMediaType] = useState<'image' | 'video'>('image');
  const [bannerMediaUrl, setBannerMediaUrl] = useState('');
  const [bannerIsPureMedia, setBannerIsPureMedia] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // Server Keys & Feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [keyStats, setKeyStats] = useState<KeyHealthStats | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUsers();
    fetchFeedback();
    fetchKeyHealth();
    fetchNotificationHistory();
  }, []);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/owner/users?search=${encodeURIComponent(userSearch)}`);
      const data = await res.json();
      if (data.users) {
        setUsersList(data.users);
      }
    } catch (e) {
      console.warn('Failed to fetch registered users:', e);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleRestrict = async (targetUser: OwnerUserRecord) => {
    setRestrictingId(targetUser.id);
    try {
      const res = await fetch(`/api/owner/users/${encodeURIComponent(targetUser.id)}/toggle-restrict`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(prev =>
          prev.map(u => (u.id === targetUser.id ? { ...u, isRestricted: data.isRestricted } : u))
        );
        if (selectedUserDetails && selectedUserDetails.id === targetUser.id) {
          setSelectedUserDetails(prev => prev ? { ...prev, isRestricted: data.isRestricted } : null);
        }
      }
    } catch (e) {
      alert('Failed to update account restriction status.');
    } finally {
      setRestrictingId(null);
    }
  };

  const fetchFeedback = async () => {
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (data.feedback) setFeedbackList(data.feedback);
    } catch (e) {
      console.warn('Feedback fetch error');
    }
  };

  const fetchKeyHealth = async () => {
    try {
      const res = await fetch('/api/key-health');
      const data = await res.json();
      setKeyStats(data);
    } catch (e) {
      console.warn('Key health fetch error');
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    setNotifSendStatus('Sending...');
    setNotifStatusMessage('Broadcasting notification to students across device sessions...');

    try {
      const res = await sendVerifiedNotification(
        notifTitle.trim(),
        notifMessage.trim(),
        notifAudience,
        notifRecipientEmail.trim() || undefined
      );

      if (res.success) {
        setNotifSendStatus('Successfully Sent');
        setNotifStatusMessage(`Delivered at ${new Date().toLocaleTimeString()} — ${res.message}`);
        setNotifTitle('');
        setNotifMessage('');
        setNotifRecipientEmail('');
        await fetchNotificationHistory();
      } else {
        setNotifSendStatus('Failed to Send');
        setNotifStatusMessage(`Error: ${res.message}`);
      }
    } catch (err: any) {
      setNotifSendStatus('Failed to Send');
      setNotifStatusMessage(`Failed to dispatch: ${err.message}`);
    }
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setBannerMediaType(isVideo ? 'video' : 'image');
    const reader = new FileReader();
    reader.onload = () => {
      setBannerMediaUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerMediaUrl.trim()) {
      alert('Please select an image or video file from your device Gallery or File Manager.');
      return;
    }
    setSavingBanner(true);
    try {
      await saveBanner({
        title: bannerIsPureMedia ? '' : bannerTitle.trim(),
        description: bannerIsPureMedia ? '' : bannerDesc.trim(),
        mediaType: bannerMediaType,
        mediaUrl: bannerMediaUrl.trim(),
        isActive: true
      });
      setBannerTitle('');
      setBannerDesc('');
      setBannerMediaUrl('');
      alert('Homepage celebration banner published successfully!');
    } catch (err: any) {
      alert(`Failed to publish banner: ${err.message}`);
    } finally {
      setSavingBanner(false);
    }
  };

  const handleReplyFeedback = async (id: string) => {
    const text = replyTextMap[id];
    if (!text || !text.trim()) return;
    try {
      const res = await fetch('/api/feedback/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, response: text.trim(), status: 'resolved' })
      });
      if (res.ok) {
        alert('Reply saved and sent to student!');
        fetchFeedback();
      }
    } catch (e) {
      alert('Failed to send reply');
    }
  };

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Protected Owner Area</h2>
        <p className="text-xs text-slate-500">
          Access is strictly restricted to authorized platform owners (Sonam Kumari & Rishabh Singh Rajput).
        </p>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u =>
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.mobile.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-900/50 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold uppercase tracking-wider border border-amber-400/30">
            <Crown className="w-4 h-4 text-amber-400" />
            Authorized Platform Owner
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            AarohAI Control Center
          </h1>
          <p className="text-sm text-indigo-200/80 max-w-xl">
            Manage registered students, broadcast verified announcements, publish celebration banners, and inspect real-time AI system health.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            100% Free Platform Active
          </div>
          <button
            onClick={() => {
              fetchUsers();
              fetchFeedback();
              fetchKeyHealth();
              fetchNotificationHistory();
            }}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all shadow-sm"
            title="Refresh All Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'overview', label: 'Overview', icon: Activity, count: null },
          { id: 'users', label: 'Student Users', icon: Users, count: usersList.length },
          { id: 'banners', label: 'Celebration Banners', icon: ImageIcon, count: banners.length },
          { id: 'notifications', label: 'Notification Center', icon: Bell, count: notificationHistory.length },
          { id: 'keys', label: 'AI Key Health', icon: Server, count: keyStats?.totalKeys || 0 },
          { id: 'feedback', label: 'Support & Help', icon: MessageSquare, count: feedbackList.filter(f => f.status === 'Pending').length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                  isActive ? 'bg-white text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: OVERVIEW
      ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Students</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{usersList.length}</h3>
                <p className="text-2xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Free Lifetime Access
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Banners</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{banners.length}</h3>
                <p className="text-2xs text-slate-500 mt-1">Direct Gallery/File Upload</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Broadcast History</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{notificationHistory.length}</h3>
                <p className="text-2xs text-emerald-600 dark:text-emerald-400 mt-1">Verified delivery tracking</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Support Tickets</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {feedbackList.filter(f => f.status === 'Pending').length}
                </h3>
                <p className="text-2xs text-slate-500 mt-1">Student inquiries</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-800/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 dark:text-emerald-300">Cleaned 100% Free Educational Architecture</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  All paywalls, subscriptions, coupons, pricing plans, and QR payment restrictions have been permanently removed. Every student has complete free access to all 16 Mind Map templates, AI Chat, Notes, Quizzes, and Answer Checker.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: STUDENT USER INFORMATION MANAGEMENT
      ===================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Student User Management
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect registered students (Name, Gmail, Mobile Number, Registration Date, Last Login) and manage access.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, or mobile..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={fetchUsers}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-2xs text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Gmail Address</th>
                    <th className="px-4 py-3">Mobile Number</th>
                    <th className="px-4 py-3">Registered On</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        {usersLoading ? 'Loading registered users...' : 'No registered students found matching your query.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-2xs flex items-center justify-center shrink-0">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.fullName}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-2xs text-slate-600 dark:text-slate-300">
                          {u.email}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-2xs text-slate-600 dark:text-slate-300">
                          {u.mobile || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-2xs text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-2xs text-slate-500">
                          {new Date(u.lastLoginAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5">
                          {u.isRestricted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-600 text-2xs font-bold border border-red-200 dark:border-red-900">
                              <UserX className="w-3 h-3" /> Restricted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 text-2xs font-bold border border-emerald-200 dark:border-emerald-900">
                              <UserCheck className="w-3 h-3" /> Active 🟢
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedUserDetails(u)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
                            title="View Full Profile Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleRestrict(u)}
                            disabled={restrictingId === u.id}
                            className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${
                              u.isRestricted
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-600 border border-red-200 dark:border-red-900'
                            }`}
                          >
                            {u.isRestricted ? 'Unrestrict' : 'Restrict'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Details Modal */}
          {selectedUserDetails && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Student Profile Details
                  </h3>
                  <button
                    onClick={() => setSelectedUserDetails(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                      {selectedUserDetails.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{selectedUserDetails.fullName}</h4>
                      <p className="text-2xs text-slate-400">UID: {selectedUserDetails.id}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold">Email:</span>
                      <span className="font-mono text-2xs text-slate-900 dark:text-white">{selectedUserDetails.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold">Mobile:</span>
                      <span className="font-mono text-2xs text-slate-900 dark:text-white">{selectedUserDetails.mobile || 'Not provided'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold">Registered:</span>
                      <span>{new Date(selectedUserDetails.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold">Last Login:</span>
                      <span>{new Date(selectedUserDetails.lastLoginAt).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold">Account Status:</span>
                      <span className={selectedUserDetails.isRestricted ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                        {selectedUserDetails.isRestricted ? 'Restricted' : 'Active (100% Free Access)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleToggleRestrict(selectedUserDetails)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedUserDetails.isRestricted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {selectedUserDetails.isRestricted ? 'Unrestrict User Account' : 'Restrict User Account'}
                  </button>
                  <button
                    onClick={() => setSelectedUserDetails(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: HOMEPAGE CELEBRATION & ANNOUNCEMENT BANNERS
      ===================================================================== */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                Homepage Celebration & Announcement Banners
              </h3>
              <p className="text-xs text-slate-500">
                Upload images or promotional videos directly from your mobile Gallery or device File Manager. Display festival greetings (Diwali, Holi, Welcome to AarohAI) or pure media without text.
              </p>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4 max-w-2xl">
              {/* File Upload Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Banner Image or Video from Device (Gallery / File Manager) *
                </label>
                <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-6 text-center hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleBannerFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tap to select Image or Video from Gallery / File Manager
                    </p>
                    <p className="text-2xs text-slate-400">
                      Supported: JPG, JPEG, PNG, WEBP, MP4, WEBM
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Box */}
              {bannerMediaUrl && (
                <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Selected Media Preview:</span>
                    <button
                      type="button"
                      onClick={() => setBannerMediaUrl('')}
                      className="text-red-500 hover:text-red-600 text-2xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove File
                    </button>
                  </div>
                  <div className="rounded-2xl overflow-hidden max-h-64 bg-black flex items-center justify-center">
                    {bannerMediaType === 'video' ? (
                      <video src={bannerMediaUrl} controls className="max-h-64 w-full object-contain" />
                    ) : (
                      <img src={bannerMediaUrl} alt="Preview" className="max-h-64 w-full object-contain" />
                    )}
                  </div>
                </div>
              )}

              {/* Pure Media Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pureMedia"
                  checked={bannerIsPureMedia}
                  onChange={(e) => setBannerIsPureMedia(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="pureMedia" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Display pure image / video only (no overlay headline or text)
                </label>
              </div>

              {!bannerIsPureMedia && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Celebration / Announcement Title
                    </label>
                    <input
                      type="text"
                      value={bannerTitle}
                      onChange={(e) => setBannerTitle(e.target.value)}
                      placeholder="e.g. 🪔 Happy Diwali from AarohAI! | 🌸 Happy Holi!"
                      className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Celebration Description (Optional)
                    </label>
                    <textarea
                      value={bannerDesc}
                      onChange={(e) => setBannerDesc(e.target.value)}
                      rows={2}
                      placeholder="Wishing all students prosperity, academic excellence and joy this festive season!"
                      className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={savingBanner || !bannerMediaUrl}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                {savingBanner ? 'Publishing...' : 'Publish Celebration Banner'}
              </button>
            </form>

            {/* Currently Active Banners */}
            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Currently Active Homepage Banners ({banners.length})
              </h4>

              {banners.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No promotional or celebration banner active right now. Upload one above to display on the homepage.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {banners.map(banner => (
                    <div
                      key={banner.id}
                      className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="rounded-2xl overflow-hidden max-h-44 bg-black flex items-center justify-center">
                          {banner.mediaType === 'video' ? (
                            <video src={banner.mediaUrl} controls className="max-h-44 w-full object-contain" />
                          ) : (
                            <img src={banner.mediaUrl} alt={banner.title || 'Banner'} className="max-h-44 w-full object-contain" />
                          )}
                        </div>
                        {banner.title && (
                          <h5 className="font-bold text-slate-900 dark:text-white text-xs">{banner.title}</h5>
                        )}
                        {banner.description && (
                          <p className="text-2xs text-slate-500 line-clamp-2">{banner.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-2xs text-slate-400">
                          {new Date(banner.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => deleteBanner(banner.id)}
                          className="px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 hover:bg-red-200 text-red-600 text-2xs font-bold flex items-center gap-1 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove Banner
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: NOTIFICATION CENTER (Verified Delivery Tracking)
      ===================================================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Notification Center (Verified Delivery Status)
              </h3>
              <p className="text-xs text-slate-500">
                Send real-time alerts with verified backend status: <span className="font-semibold text-amber-500">Sending...</span> → <span className="font-semibold text-emerald-500">Successfully Sent</span>.
              </p>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4 max-w-2xl">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notification Title *
                </label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. 🚀 16 Deep Research Mind Map Templates Released!"
                  required
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notification Message *
                </label>
                <textarea
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  rows={3}
                  placeholder="Write clear announcement instructions or celebration message for students..."
                  required
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Target Audience
                  </label>
                  <select
                    value={notifAudience}
                    onChange={(e) => setNotifAudience(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Registered Students (Broadcast)</option>
                    <option value="specific">Specific Student (By Gmail Address)</option>
                  </select>
                </div>

                {notifAudience === 'specific' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Recipient Student Gmail *
                    </label>
                    <input
                      type="email"
                      value={notifRecipientEmail}
                      onChange={(e) => setNotifRecipientEmail(e.target.value)}
                      placeholder="student@gmail.com"
                      required
                      className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Live Delivery Status Indicator */}
              {notifSendStatus !== 'idle' && (
                <div className={`p-4 rounded-2xl text-xs flex items-center gap-3 border ${
                  notifSendStatus === 'Sending...'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-700 dark:text-amber-400'
                    : notifSendStatus === 'Successfully Sent'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-700 dark:text-red-400'
                }`}>
                  {notifSendStatus === 'Sending...' && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
                  {notifSendStatus === 'Successfully Sent' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  {notifSendStatus === 'Failed to Send' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <div>
                    <span className="font-bold uppercase tracking-wider text-2xs block">{notifSendStatus}</span>
                    <span className="text-xs">{notifStatusMessage}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={notifSendStatus === 'Sending...'}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                {notifSendStatus === 'Sending...' ? 'Sending Notification...' : 'Send Notification'}
              </button>
            </form>

            {/* Notification History Table */}
            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Notification Dispatch History ({notificationHistory.length})
                </h4>
                <button
                  onClick={fetchNotificationHistory}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh History
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-2xs text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Sent Timestamp</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notificationHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                          No notifications sent yet.
                        </td>
                      </tr>
                    ) : (
                      notificationHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                            {item.title}
                          </td>
                          <td className="px-4 py-3 text-2xs text-slate-500 max-w-xs truncate">
                            {item.message}
                          </td>
                          <td className="px-4 py-3 text-2xs font-mono">
                            {item.recipientEmail || (item.targetAudience === 'all' ? 'All Students' : item.targetAudience)}
                          </td>
                          <td className="px-4 py-3 text-2xs text-slate-500">
                            {new Date(item.sentAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-2xs font-bold border border-emerald-200 dark:border-emerald-900">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Successfully Sent
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: SERVER API KEY HEALTH & FAILOVER
      ===================================================================== */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-600" />
                  System Gemini API Key Health & Failover Pool
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect backend server key pool status, healthy rotation, and quota exhaustion safeguards.
                </p>
              </div>
              <button
                onClick={fetchKeyHealth}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Keys
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {keyStats?.keys?.map((k, idx) => (
                <div
                  key={k.id || idx}
                  className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{k.name}</span>
                    <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {k.status}
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-2xs text-slate-500">
                    <div>Key: {k.maskedKey}</div>
                    <div>Successes: {k.successCount} | Errors: {k.errorCount}</div>
                    {k.lastUsed && <div>Last Used: {k.lastUsed}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: USER HELP & SUPPORT FEEDBACK
      ===================================================================== */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Student Support Messages & Inquiries
                </h3>
                <p className="text-xs text-slate-500">
                  Read queries from students and provide direct owner replies.
                </p>
              </div>
              <button
                onClick={fetchFeedback}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {feedbackList.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  No support inquiries at the moment.
                </p>
              ) : (
                feedbackList.map(item => (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white">{item.subject}</h5>
                        <p className="text-2xs text-slate-400">
                          From: {item.userName} ({item.userEmail}) • Category: {item.category} • {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                        item.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      {item.message}
                    </p>

                    {item.response ? (
                      <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs space-y-1">
                        <span className="font-bold text-indigo-900 dark:text-indigo-300 text-2xs block">Your Reply:</span>
                        <p className="text-slate-700 dark:text-slate-300">{item.response}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2">
                        <input
                          type="text"
                          value={replyTextMap[item.id] || ''}
                          onChange={(e) => setReplyTextMap({ ...replyTextMap, [item.id]: e.target.value })}
                          placeholder="Type your response to this student..."
                          className="w-full px-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleReplyFeedback(item.id)}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                        >
                          Send Reply
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
