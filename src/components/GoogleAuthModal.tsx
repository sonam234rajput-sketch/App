import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  UserCheck,
  LogOut,
  Sparkles,
  Lock,
  ArrowRight,
  Database,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ isOpen, onClose }) => {
  const { user, loginWithGoogle, logout, isOwner } = useAuth();
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      setError('Please enter a valid Google account email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate Google user');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAccount = (email: string, name: string) => {
    loginWithGoogle();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 max-w-lg w-full space-y-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#ffffff"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#ffffff"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#ffffff"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#ffffff"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Google Account & Workspace</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized private workspace for AI chats, quizzes, mind maps & notes
            </p>
          </div>
        </div>

        {/* Current Active Workspace Status */}
        {user ? (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                    {isOwner ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                        Authorized Owner
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Student Workspace
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs font-bold flex items-center gap-1"
                title="Sign out of this workspace"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-indigo-200/50 dark:border-indigo-800/50">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span>Workspace ID: <code className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{user.id}</code></span>
              <span className="text-emerald-600 font-bold ml-auto flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Encrypted & Isolated
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0 text-amber-600" />
            <span>You are currently in guest mode. Sign in with Google to isolate and permanently save your quizzes, mind maps, and notes.</span>
          </div>
        )}

        {/* Enter Real Google Email Form */}
        <form onSubmit={handleCustomLogin} className="space-y-4">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Sign In with Any Google Account
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Google Email (Gmail)
              </label>
              <input
                type="email"
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="your.name@gmail.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Student / Display Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Rohit Kumar"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 dark:bg-red-950/50 p-2.5 rounded-xl border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In & Load Workspace'}</span>
          </button>
        </form>

        {/* Quick Demo & Test Workspaces */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Quick Switch Workspace
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickAccount('rishabh.student@aarohai.in', 'Rishabh Kumar (Founder & Student)')}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-left border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Rishabh Kumar</p>
                <p className="text-[10px] text-slate-500">Student Workspace</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => handleQuickAccount('sonamkumari40411@gmail.com', 'Sonam Kumari')}
              className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-left border border-purple-200 dark:border-purple-800 transition-colors flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-purple-900 dark:text-purple-200">Sonam Kumari</p>
                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                </div>
                <p className="text-[10px] text-purple-700 dark:text-purple-300">Authorized Owner Panel</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
