import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { NotificationProvider } from './context/NotificationContext';
import { BannerProvider } from './context/BannerContext';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { AiChat } from './components/AiChat/AiChat';
import { QuizGenerator } from './components/Quiz/QuizGenerator';
import { AnswerChecker } from './components/AnswerChecker/AnswerChecker';
import { MindMapGenerator } from './components/MindMap/MindMapGenerator';
import { NotesGenerator } from './components/Notes/NotesGenerator';
import { FocusTimer } from './components/FocusTimer/FocusTimer';
import { AnalyticsDashboard } from './components/Analytics/AnalyticsDashboard';
import { NcertLibrary } from './components/Library/NcertLibrary';
import { SavedLibrary } from './components/SavedLibrary/SavedLibrary';
import { HelpFeedback } from './components/HelpFeedback/HelpFeedback';
import { AboutDeveloper } from './components/AboutDeveloper/AboutDeveloper';
import { OwnerDashboard } from './components/OwnerDashboard/OwnerDashboard';
import { SettingsPage } from './components/Settings/SettingsPage';
import { YouTubeAnalysis } from './components/YouTubeAnalysis/YouTubeAnalysis';
import { ApiKeyManager } from './components/ApiKeyManager';
import { GoogleReviewModal } from './components/GoogleReviewModal';
import { RegistrationModal } from './components/RegistrationModal';

const MainAppContent: React.FC = () => {
  const { activeTab, loading: authLoading, user } = useAuth();
  const { loading: libLoading } = useLibrary();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  if (authLoading || libLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Loading your workspace...</p>
      </div>
    );
  }

  // Blocked user check
  if (user && user.isRestricted && activeTab !== 'help') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="p-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Account Restricted</h2>
          <p className="text-slate-700 dark:text-slate-300">Your account has been blocked by the admin.</p>
        </div>
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeDashboard onOpenGoogleReview={() => setReviewModalOpen(true)} />;
      case 'chat':
        return <AiChat />;
      case 'quiz':
        return <QuizGenerator />;
      case 'answer-checker':
        return <AnswerChecker />;
      case 'mindmap':
        return <MindMapGenerator />;
      case 'notes':
        return <NotesGenerator />;
      case 'timer':
        return <FocusTimer />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'ncert-library':
        return <NcertLibrary />;
      case 'saved-library':
        return <SavedLibrary />;
      case 'api-keys':
        return <ApiKeyManager />;
      case 'help':
        return <HelpFeedback />;
      case 'about':
        return <AboutDeveloper />;
      case 'youtube':
        return <YouTubeAnalysis />;
      case 'settings':
        return <SettingsPage />;
      case 'owner':
        return <OwnerDashboard />;
      default:
        return <HomeDashboard onOpenGoogleReview={() => setReviewModalOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar onOpenGoogleReview={() => setReviewModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderActiveTab()}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} AarohAI — Founded & Developed by Rishabh Kumar, Bhagalpur, Bihar, India.</p>
          <div className="flex items-center gap-4">
            <span className="hover:underline cursor-pointer">Terms & Privacy</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Support: rishavh332@gmail.com</span>
          </div>
        </div>
      </footer>

      <GoogleReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
      />

      <RegistrationModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <NotificationProvider>
          <BannerProvider>
            <MainAppContent />
          </BannerProvider>
        </NotificationProvider>
      </LibraryProvider>
    </AuthProvider>
  );
}
