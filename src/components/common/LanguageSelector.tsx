import React from 'react';

interface LanguageSelectorProps {
  language: 'English' | 'Hindi' | 'Hinglish';
  onChange: (language: 'English' | 'Hindi' | 'Hinglish') => void;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, onChange, className = '' }) => {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Language</label>
      <select
        value={language}
        onChange={(e) => onChange(e.target.value as any)}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
      >
        <option value="Hinglish">Hinglish</option>
        <option value="English">English</option>
        <option value="Hindi">Hindi (हिंदी)</option>
      </select>
    </div>
  );
};
