import React, { useState } from 'react';
import {
  GraduationCap,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Brain,
  MessageSquare,
  FileText,
  Clock,
  CheckSquare,
  BarChart2,
  Bookmark,
  HelpCircle,
  ShieldCheck,
  Menu,
  X,
  User,
  LogOut,
  Star,
  Settings,
  Youtube
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../types';
import { t } from '../utils/translations';
import { NotificationBell } from './Notifications/NotificationBell';

interface NavbarProps {
  onOpenGoogleReview?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenGoogleReview }) => {
  const { user, theme, toggleTheme, loginWithGoogle, logout, isOwner, activeTab, setActiveTab, language } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: t('home', language), icon: GraduationCap },
    { id: 'chat', label: t('chat', language), icon: MessageSquare },
    { id: 'youtube', label: t('youtube', language), icon: Youtube },
    { id: 'quiz', label: t('quiz', language), icon: BookOpen },
    { id: 'mindmap', label: t('mindmap', language), icon: Brain },
    { id: 'notes', label: t('notes', language), icon: FileText },
    { id: 'answer-checker', label: t('answerChecker', language), icon: CheckSquare },
    { id: 'timer', label: t('timer', language), icon: Clock },
    { id: 'analytics', label: t('analytics', language), icon: BarChart2 },
    { id: 'ncert-library', label: 'NCERT Library', icon: BookOpen },
    { id: 'saved-library', label: t('myLibrary', language), icon: Bookmark },
    { id: 'api-keys', label: t('apiKeys', language), icon: Sparkles },
    { id: 'help', label: t('help', language), icon: HelpCircle },
    { id: 'settings', label: t('settings', language), icon: Settings },
    { id: 'about', label: t('about', language), icon: Sparkles }
  ];

  if (isOwner) {
    navItems.push({ id: 'owner', label: t('ownerPanel', language), icon: ShieldCheck });
  }

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo Zone */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-400 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-amber-400">
                <GraduationCap className="w-6 h-6 text-amber-400 transform -rotate-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 bg-clip-text text-transparent">
                  AarohAI
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  India
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Learn • Practice • Grow
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            
            {/* Notification Bell */}
            <NotificationBell />

            {/* Google Review Button */}
            {onOpenGoogleReview && (
              <button
                onClick={onOpenGoogleReview}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                title="Rate & Review AarohAI"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{t('rateUs', language)}</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* User Account / Google Sign-In */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500/20 transition-all"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden md:inline pr-2">
                    {user.name.split(' ')[0]}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      {isOwner && (
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                          Authorized Owner
                        </span>
                      )}
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => {
                          handleNavClick('owner');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center gap-2"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{t('ownerPanel', language)}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleNavClick('saved-library');
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{t('myLibrary', language)}</span>
                    </button>
                    <button
                      onClick={() => {
                        handleNavClick('settings');
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{t('settings', language)}</span>
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t('logout', language)}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => loginWithGoogle()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{t('login', language)}</span>
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
