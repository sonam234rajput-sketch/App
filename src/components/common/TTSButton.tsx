import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Pause, Play, RotateCcw } from 'lucide-react';
import { ttsService, TTSState } from '../../services/ttsService';

interface TTSButtonProps {
  id: string;
  text: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'pill' | 'subtle';
  lang?: 'hi-IN' | 'en-IN' | 'en-US';
  className?: string;
}

export const TTSButton: React.FC<TTSButtonProps> = ({
  id,
  text,
  label,
  size = 'md',
  variant = 'icon',
  lang,
  className = '',
}) => {
  const [ttsState, setTtsState] = useState<TTSState>(ttsService.getState());

  useEffect(() => {
    const unsubscribe = ttsService.subscribe((state) => {
      setTtsState(state);
    });
    return unsubscribe;
  }, []);

  const isCurrent = ttsState.currentId === id;
  const isPlaying = isCurrent && ttsState.isPlaying && !ttsState.isPaused;
  const isPaused = isCurrent && ttsState.isPaused;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    ttsService.toggle(id, text, lang);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    ttsService.stop();
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (variant === 'pill') {
    return (
      <div className="inline-flex items-center gap-1">
        <button
          onClick={handleClick}
          title={isPlaying ? 'Pause Speech' : isPaused ? 'Resume Speech' : 'Listen with Audio'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
            isPlaying
              ? 'bg-amber-500 text-white shadow-amber-500/20 ring-2 ring-amber-400/50 animate-pulse'
              : isPaused
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/90 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800'
          } ${className}`}
        >
          {isPlaying ? (
            <>
              <Pause className={iconSizes[size]} />
              <span>Pause Audio</span>
              <span className="flex items-center gap-0.5 ml-1">
                <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </>
          ) : isPaused ? (
            <>
              <Play className={iconSizes[size]} />
              <span>Resume</span>
            </>
          ) : (
            <>
              <Volume2 className={iconSizes[size]} />
              <span>{label || 'Listen Audio'}</span>
            </>
          )}
        </button>

        {isCurrent && (
          <button
            onClick={handleStop}
            title="Stop Audio"
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-400 text-slate-500 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'subtle') {
    return (
      <button
        onClick={handleClick}
        title={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Listen'}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
          isPlaying
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        } ${className}`}
      >
        {isPlaying ? (
          <>
            <Pause className={iconSizes[size]} />
            <span>Speaking...</span>
          </>
        ) : (
          <>
            <Volume2 className={iconSizes[size]} />
            <span>{label || 'Listen'}</span>
          </>
        )}
      </button>
    );
  }

  // Default: Icon only
  return (
    <button
      onClick={handleClick}
      title={isPlaying ? 'Pause audio' : isPaused ? 'Resume audio' : 'Listen with Audio'}
      className={`p-1.5 rounded-xl transition-all relative ${
        isPlaying
          ? 'bg-amber-500 text-white shadow-xs scale-105'
          : isPaused
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      } ${className}`}
    >
      {isPlaying ? (
        <span className="relative flex items-center justify-center">
          <Pause className={iconSizes[size]} />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400 animate-ping" />
        </span>
      ) : isPaused ? (
        <Play className={iconSizes[size]} />
      ) : (
        <Volume2 className={iconSizes[size]} />
      )}
    </button>
  );
};
