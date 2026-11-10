import React from 'react';
import { 
  User, 
  Moon, 
  Sun, 
  Languages, 
  LogOut, 
  LogIn, 
  Settings, 
  ChevronRight,
  ShieldCheck,
  Palette,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { 
    user, 
    theme, 
    toggleTheme, 
    loginWithGoogle, 
    logout, 
    language, 
    setLanguage,
    isOwner 
  } = useAuth();

  const languages: { id: 'English' | 'Hindi' | 'Hinglish'; label: string; sub: string }[] = [
    { id: 'English', label: 'English', sub: 'Academic & Professional' },
    { id: 'Hindi', label: 'हिंदी (Hindi)', sub: 'शुद्ध हिंदी भाषा' },
    { id: 'Hinglish', label: 'Hinglish', sub: 'Natural Mixed (Indo-English)' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {language === 'Hindi' ? 'सेटिंग्स' : language === 'Hinglish' ? 'Settings' : 'Settings'}
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {language === 'Hindi' 
              ? 'अपने खाते, दिखावट और भाषा की प्राथमिकताओं को प्रबंधित करें।' 
              : language === 'Hinglish' 
              ? 'Apne account, appearance aur language settings ko manage karein.' 
              : 'Manage your account, appearance and language preferences.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Account Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <User className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {language === 'Hindi' ? 'खाता सेटिंग्स' : 'Account Settings'}
            </h2>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md h-full">
            {user ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-lg"
                    />
                    {isOwner && (
                      <div className="absolute -top-2 -right-2 p-1.5 bg-amber-400 text-white rounded-lg shadow-lg border-2 border-white dark:border-slate-900" title="Verified Owner">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{user.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {isOwner ? 'Authorized Admin' : 'Free Student Plan'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-sm transition-all hover:bg-red-100 dark:hover:bg-red-950/40 border border-red-100 dark:border-red-900/30"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="w-4 h-4" />
                      <span>{language === 'Hindi' ? 'साइन आउट करें' : 'Sign Out from AarohAI'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {language === 'Hindi' ? 'लॉग इन नहीं है' : 'Not Signed In'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                    {language === 'Hindi' 
                      ? 'अपनी प्रगति, लाइब्रेरी और अध्ययन विश्लेषण को सभी उपकरणों पर सहेजने के लिए लॉगिन करें।' 
                      : 'Login to save your progress, library and study analytics across devices.'}
                  </p>
                </div>
                <button
                  onClick={loginWithGoogle}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{language === 'Hindi' ? 'गूगल के साथ लॉगिन करें' : 'Login with Google'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Appearance Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Palette className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {language === 'Hindi' ? 'दिखावट' : 'Appearance'}
            </h2>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {language === 'Hindi' ? 'डार्क मोड' : 'Dark Mode'}
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500">
                    {language === 'Hindi' ? 'कम रोशनी में आंखों के तनाव को कम करें।' : 'Reduce eye strain in low light.'}
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-transparent focus:ring-indigo-500/40 ${
                    theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    theme === 'light' 
                      ? 'bg-white border-indigo-200 ring-2 ring-indigo-500/20 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-indigo-600' : ''}`} />
                  <span className="text-xs font-bold">{language === 'Hindi' ? 'लाइट' : 'Light'}</span>
                </button>
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-indigo-900 ring-2 ring-indigo-500/40 shadow-sm text-white' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-amber-400' : ''}`} />
                  <span className="text-xs font-bold">{language === 'Hindi' ? 'डार्क' : 'Dark'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {language === 'Hindi' ? 'भाषा प्राथमिकताएं' : 'Language Preferences'}
            </h2>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {languages.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                    language === lang.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 ring-4 ring-indigo-500/10'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${
                    language === lang.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Languages className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${language === lang.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {lang.label}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-500 uppercase tracking-tighter">
                      {lang.sub}
                    </p>
                  </div>
                  {language === lang.id && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-glow" />
                  )}
                </button>
              ))}
            </div>
            <p className="mt-6 text-[10px] font-bold text-center text-slate-400 uppercase tracking-[0.2em]">
              {language === 'Hindi' 
                ? 'परिवर्तन पूरे प्लेटफॉर्म पर तुरंत लागू होते हैं' 
                : language === 'Hinglish' 
                ? 'Changes instantly apply hote hain poore platform par' 
                : 'Changes are applied instantly across the entire platform'}
            </p>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="pt-8 pb-4 text-center space-y-4">
        <div className="flex items-center justify-center gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
            <User className="w-5 h-5" />
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
            <Globe className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          AarohAI Secure Environment • Version 3.1.0
        </p>
      </div>
    </div>
  );
};
