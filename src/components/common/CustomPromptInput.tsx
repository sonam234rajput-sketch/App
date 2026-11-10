import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, X, Lightbulb } from 'lucide-react';

interface CustomPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const CustomPromptInput: React.FC<CustomPromptInputProps> = ({
  value,
  onChange,
  placeholder = 'उदा. आसान हिंदी में समझाओ, महत्वपूर्ण फॉर्मूले शामिल करो...',
  label = 'Optional Custom Instructions (मनचाहे निर्देश ✨)'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const suggestionChips = [
    'आसान हिंदी में समझाओ',
    'विस्तार से समझाओ',
    'चित्रों और Diagrams के साथ समझाओ',
    'Bihar Board परीक्षा के अनुसार',
    'CBSE Board पैटर्न अनुसार',
    'महत्वपूर्ण प्रश्नों पर ज्यादा ध्यान दो',
    'कम शब्दों में Summary दो',
    'बिल्कुल Basic Level से समझाओ'
  ];

  const handleChipClick = (chip: string) => {
    if (!isOpen) setIsOpen(true);
    if (!value) {
      onChange(chip);
    } else if (!value.includes(chip)) {
      onChange(`${value.trim()}, ${chip}`);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 p-3.5 transition-all">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
        >
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>{label}</span>
          {value.trim() && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Custom prompt active" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-slate-800 text-slate-500"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 space-y-2.5">
          {/* Suggestion Chips */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>Quick Suggestions (Click to add):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all shadow-2xs"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="w-full bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                title="Clear instruction"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            💡 खाली छोड़ने पर भी AI अपने सर्वश्रेष्ठ शैक्षणिक मानकों पर उत्तर देगा।
          </p>
        </div>
      )}
    </div>
  );
};
