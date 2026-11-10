import React, { useState } from 'react';
import {
  BookOpen,
  Brain,
  MessageSquare,
  FileText,
  Clock,
  CheckSquare,
  HelpCircle,
  MessageCircle,
  Star,
  GraduationCap,
  Sparkles,
  ArrowRight,
  UserCheck,
  Target,
  CheckCircle2,
  Flame,
  Youtube
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { useBanners } from '../context/BannerContext';
import { NavTab } from '../types';
import { t } from '../utils/translations';

interface HomeDashboardProps {
  onOpenGoogleReview: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onOpenGoogleReview }) => {
  const { user, loginWithGoogle, setActiveTab, language } = useAuth();
  const { timerSessions, quizzes } = useLibrary();
  const { banners } = useBanners();

  const [dailyMinutesGoal, setDailyMinutesGoal] = useState(60);
  const [dailyQuizzesGoal, setDailyQuizzesGoal] = useState(2);

  // Compute stats
  const totalFocusMinsToday = timerSessions.reduce((acc, s) => acc + s.durationMinutes, 0) || 45; // default sample mins for demo
  const quizzesCompletedToday = quizzes.length || 1;

  const minsProgress = Math.min(100, Math.round((totalFocusMinsToday / dailyMinutesGoal) * 100));
  const quizzesProgress = Math.min(100, Math.round((quizzesCompletedToday / dailyQuizzesGoal) * 100));
  const overallGoalProgress = Math.round((minsProgress + quizzesProgress) / 2);

  const toolCards = [
    {
      id: 'youtube' as NavTab,
      title: t('youtube', language),
      subtitle: 'Video Understanding & Hub',
      description: 'Analyze public YouTube lectures into timestamps, formulas, exam questions & notes.',
      icon: Youtube,
      gradient: 'from-red-600 via-rose-600 to-amber-500',
      badge: 'Multimodal 3.8'
    },
    {
      id: 'quiz' as NavTab,
      title: t('quiz', language),
      subtitle: 'AI Test & Practice',
      description: 'Generate custom quizzes from topics, question banks, photos, or PDFs.',
      icon: BookOpen,
      gradient: 'from-indigo-500 to-purple-600',
      badge: '20-500 Qs'
    },
    {
      id: 'mindmap' as NavTab,
      title: t('mindmap', language),
      subtitle: 'Visual Learning Map',
      description: 'Transform chapters into interactive colorful branch concept maps.',
      icon: Brain,
      gradient: 'from-cyan-500 to-blue-600',
      badge: 'Interactive'
    },
    {
      id: 'chat' as NavTab,
      title: t('chat', language),
      subtitle: '24/7 Doubt Solution',
      description: 'Ask any subject doubt in Hinglish, Hindi, or English with instant answers.',
      icon: MessageSquare,
      gradient: 'from-purple-500 to-pink-600',
      badge: 'Multi-lingual'
    },
    {
      id: 'notes' as NavTab,
      title: t('notes', language),
      subtitle: 'Structured Revision',
      description: 'Instant exam-focused notes with key formulas, tables, and summaries.',
      icon: FileText,
      gradient: 'from-indigo-600 to-blue-700',
      badge: 'Saved in Account'
    },
    {
      id: 'timer' as NavTab,
      title: t('timer', language),
      subtitle: 'Study Smart & Focus',
      description: 'Pomodoro focus timer with soothing sounds and background recovery.',
      icon: Clock,
      gradient: 'from-sky-500 to-indigo-600',
      badge: 'Sound Alarms'
    },
    {
      id: 'answer-checker' as NavTab,
      title: t('answerChecker', language),
      subtitle: 'Board Marking Rubric',
      description: 'Upload handwritten photo/PDF or text to get detailed marks and model answers.',
      icon: CheckSquare,
      gradient: 'from-emerald-500 to-teal-600',
      badge: 'Photo & PDF OCR'
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Owner Published Celebration / Announcement Banners */}
      {banners.filter(b => b.isActive).length > 0 && (
        <div className="space-y-4">
          {banners.filter(b => b.isActive).map(b => (
            <div
              key={b.id}
              className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/30"
            >
              <div className={`flex flex-col ${b.title || b.description ? 'md:flex-row' : ''} items-center justify-center gap-6`}>
                <div className={`${b.title || b.description ? 'w-full md:w-1/2' : 'w-full'} rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center max-h-80 shadow-inner`}>
                  {b.mediaType === 'video' ? (
                    <video
                      src={b.mediaUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      className="w-full h-full object-contain max-h-80 rounded-xl"
                    />
                  ) : (
                    <img
                      src={b.mediaUrl}
                      alt={b.title || 'Celebration Banner'}
                      className="w-full h-full object-contain max-h-80 rounded-xl"
                    />
                  )}
                </div>

                {(b.title || b.description) && (
                  <div className="w-full md:w-1/2 space-y-3 text-center md:text-left">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-black uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Announcement / Celebration</span>
                    </span>
                    {b.title && <h3 className="text-2xl sm:text-3xl font-black text-white">{b.title}</h3>}
                    {b.description && (
                      <p className="text-sm text-slate-200 leading-relaxed max-w-lg">{b.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero Banner matching Reference Top-Left Image */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white p-6 sm:p-10 shadow-2xl border border-indigo-500/20 hero-glow">
        
        {/* Background glow graphics */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-amber-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t('tagline', language)}</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight whitespace-pre-line">
                {t('welcome', language)}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed pt-2">
                {t('designedBy', language)}
              </p>
            </div>

            {/* Account Status / Login Action */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {user ? (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-slate-300 font-medium">Logged in as</p>
                    <p className="text-xs font-bold text-white">{user.name}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => loginWithGoogle()}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t('login', language)}</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('chat')}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-sm backdrop-blur-md border border-indigo-400/30 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t('startChat', language)}</span>
              </button>
            </div>
          </div>

          {/* Right Mascot / Topper Visual Column */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-64 sm:w-72 h-64 sm:h-72 rounded-3xl bg-gradient-to-b from-indigo-500/20 to-purple-500/30 p-4 border border-white/10 flex flex-col items-center justify-center text-center backdrop-blur-sm shadow-inner">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-500 p-1 shadow-lg animate-pulse mb-3">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white">
                  <GraduationCap className="w-12 h-12 text-amber-400" />
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-white">AarohAI Assistant</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xs">
                Your personal AI study mentor for CBSE, ICSE, NEET, JEE & Competitive Exams
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>100% Free Educational Tools</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* DAILY STUDY GOAL TRACKER WIDGET */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daily Study Goal Tracker</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> 5 Day Streak
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your daily time spent in focus study and completed quizzes to stay on top
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Overall Goal Progress</p>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{overallGoalProgress}% Completed</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
              {overallGoalProgress}%
            </div>
          </div>
        </div>

        {/* Progress Bars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Focus Time Goal */}
          <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Focus Study Time</span>
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {totalFocusMinsToday} / {dailyMinutesGoal} mins
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${minsProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {minsProgress >= 100 ? '🎉 Focus goal achieved!' : `${dailyMinutesGoal - totalFocusMinsToday} mins remaining today`}
              </span>
              <button
                onClick={() => setActiveTab('timer')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Open Timer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quizzes Completed Goal */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Quizzes Completed</span>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {quizzesCompletedToday} / {dailyQuizzesGoal} Quizzes
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${quizzesProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {quizzesProgress >= 100 ? '🏆 Quiz goal achieved!' : `${Math.max(0, dailyQuizzesGoal - quizzesCompletedToday)} quizzes remaining`}
              </span>
              <button
                onClick={() => setActiveTab('quiz')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Open Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 6 Main Feature Grid matching Top-Left Reference */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Learning Suite
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select any tool below to start practicing or generating study content
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {toolCards.map(tool => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => setActiveTab(tool.id)}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${tool.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {tool.badge}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {tool.subtitle}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mt-0.5">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Tool</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar matching Reference Top-Left Image */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <button
          onClick={() => setActiveTab('help')}
          className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold text-sm transition-all shadow-xs"
        >
          <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Help & Support</span>
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-purple-50 dark:bg-slate-900 border border-purple-100 dark:border-slate-800 hover:bg-purple-100 dark:hover:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold text-sm transition-all shadow-xs"
        >
          <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span>Send Feedback</span>
        </button>

        <button
          onClick={onOpenGoogleReview}
          className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-amber-50 dark:bg-slate-900 border border-amber-100 dark:border-slate-800 hover:bg-amber-100 dark:hover:bg-slate-800 text-amber-800 dark:text-amber-300 font-bold text-sm transition-all shadow-xs"
        >
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span>Rate Us on Google</span>
        </button>
      </div>
    </div>
  );
};
