import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Bell,
  Sparkles,
  Check,
  ShieldAlert,
  Music,
  Upload,
  VolumeX,
  Radio,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export const FocusTimer: React.FC = () => {
  const { recordTimerSession } = useLibrary();

  const [selectedDuration, setSelectedDuration] = useState<number>(60); // minutes (1 hour)
  const [customMinutes, setCustomMinutes] = useState<number>(45);
  const [selectedSound, setSelectedSound] = useState('Bell Sound 🔔');

  // Active Timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [endTime, setEndTime] = useState<number | null>(null);

  // Full Screen 16:9 Mode state
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Custom Completion Music state
  const [customMusicUrl, setCustomMusicUrl] = useState<string | null>(null);
  const [customMusicName, setCustomMusicName] = useState<string>('');
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(false);

  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Motivational quote cycle
  const quotes = [
    '“The secret of getting ahead is getting started.”',
    '“Focus on being productive instead of busy.”',
    '“Dream big, work hard, stay focused, and surround yourself with good people.”',
    '“Small daily improvements over time lead to stunning results.”',
    '“Success is the sum of small efforts repeated day in and day out.”'
  ];
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Sound options
  const sounds = [
    { id: 'Bell Sound 🔔', label: 'Bell Sound 🔔', frequency: 587.33 },
    { id: 'Digital Alarm ⏰', label: 'Digital Alarm ⏰', frequency: 880 },
    { id: 'Zen Bowl 🧘', label: 'Zen Bowl 🧘', frequency: 432 },
    { id: 'Gentle Chime 🎵', label: 'Gentle Chime 🎵', frequency: 523.25 }
  ];

  // Request browser notification on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Keyboard shortcut Esc to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Update remaining seconds based on exact timestamp when running
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && endTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.round((endTime - now) / 1000));
        setRemainingSeconds(diff);

        if (diff <= 0) {
          setIsRunning(false);
          setEndTime(null);
          handleTimerComplete();
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, endTime]);

  const handleStartTimer = () => {
    const mins = selectedDuration === -1 ? customMinutes : selectedDuration;
    const totalSecs = mins * 60;
    const targetEndTime = Date.now() + totalSecs * 1000;

    stopAlarmMusic();
    setRemainingSeconds(totalSecs);
    setEndTime(targetEndTime);
    setIsRunning(true);
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
    setEndTime(null);
  };

  const handleResumeTimer = () => {
    if (remainingSeconds > 0) {
      setEndTime(Date.now() + remainingSeconds * 1000);
      setIsRunning(true);
    }
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setEndTime(null);
    stopAlarmMusic();
    const mins = selectedDuration === -1 ? customMinutes : selectedDuration;
    setRemainingSeconds(mins * 60);
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomMusicUrl(url);
    setCustomMusicName(file.name);
  };

  const playAlarmSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const matchedSound = sounds.find(s => s.id === selectedSound) || sounds[0];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(matchedSound.frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 4);
    } catch (e) {
      console.log('Audio playback prevented by browser policy');
    }
  };

  const handleTimerComplete = () => {
    const mins = selectedDuration === -1 ? customMinutes : selectedDuration;
    recordTimerSession(mins, selectedSound);

    // Play uploaded custom music file or fallback synth sound
    if (customMusicUrl && alarmAudioRef.current) {
      try {
        alarmAudioRef.current.currentTime = 0;
        alarmAudioRef.current.play();
        setIsAlarmRinging(true);
      } catch (e) {
        playAlarmSound();
      }
    } else {
      playAlarmSound();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🎉 AarohAI Focus Timer Finished!', {
        body: `Great job! You completed your ${mins} minute focus study session!`,
        icon: '/favicon.ico'
      });
    }

    alert(`🎉 AarohAI Focus Timer Finished! Shabash! You completed your ${mins} minute study session.`);
  };

  const stopAlarmMusic = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
    setIsAlarmRinging(false);
  };

  const formatTimeParts = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return {
      hours: h.toString().padStart(2, '0'),
      minutes: m.toString().padStart(2, '0'),
      seconds: s.toString().padStart(2, '0')
    };
  };

  const timeParts = formatTimeParts(remainingSeconds);
  const rawMins = selectedDuration === -1 ? customMinutes : selectedDuration;
  const totalMins = Number.isFinite(rawMins) && rawMins > 0 ? rawMins : 1;
  const totalSeconds = totalMins * 60;
  const progressPercent = totalSeconds > 0 
    ? Math.min(100, Math.max(0, ((totalSeconds - (Number.isFinite(remainingSeconds) ? remainingSeconds : 0)) / totalSeconds) * 100))
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Hidden HTML5 Audio Element for Completion Music Alarm */}
      {customMusicUrl && (
        <audio
          ref={alarmAudioRef}
          src={customMusicUrl}
          loop
          onPlay={() => setIsAlarmRinging(true)}
          onEnded={() => setIsAlarmRinging(false)}
          className="hidden"
        />
      )}

      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Widescreen Focus Timer</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold uppercase">
                16:9 Rectangular & Alarm Songs
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rectangular study timer with 16:9 full-screen mode, landscape mobile rotation & custom alarm music
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsFullScreen(prev => !prev)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span>{isFullScreen ? 'Exit Full-Screen' : '16:9 Full Screen'}</span>
        </button>
      </div>

      {/* ALARM MUSIC RINGING BANNER */}
      {isAlarmRinging && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white shadow-xl flex items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3">
            <Radio className="w-6 h-6 animate-spin" />
            <div>
              <h4 className="font-extrabold text-sm">🎉 Timer Completed! Playing Alarm Song...</h4>
              <p className="text-xs opacity-90">{customMusicName || 'Completion Music Playing'}</p>
            </div>
          </div>
          <button
            onClick={stopAlarmMusic}
            className="px-4 py-2 rounded-xl bg-white text-slate-900 font-black text-xs shadow-md hover:bg-slate-100"
          >
            ⏹️ Stop Music
          </button>
        </div>
      )}

      {/* RECTANGULAR WIDESCREEN TIMER DISPLAY (Normal View & Fullscreen Overlay) */}
      <div
        className={`${
          isFullScreen
            ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 sm:p-10 w-full h-full overflow-y-auto'
            : 'relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white p-6 sm:p-10 shadow-2xl border border-sky-500/20'
        }`}
      >
        {/* Fullscreen Top Exit Bar */}
        {isFullScreen && (
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-extrabold text-cyan-300">16:9 Widescreen Landscape Mode</span>
            </div>
            <button
              onClick={() => setIsFullScreen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Exit Full Screen (Esc)</span>
            </button>
          </div>
        )}

        {/* WIDESCREEN 16:9 RECTANGULAR TIMER CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1">
          
          {/* Left / Center Rectangular Widescreen Time Board */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-6">
            
            {/* Widescreen 16:9 Digital Time Box */}
            <div className="w-full aspect-video max-w-2xl bg-slate-900/90 rounded-3xl p-6 border-2 border-cyan-400/40 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md">
              
              {/* Top Progress Bar across Rectangular Header */}
              <div className="absolute top-0 left-0 right-0 h-3 bg-slate-950">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Big Digital Numbers */}
              <div className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-widest text-white font-mono drop-shadow-2xl my-2">
                {timeParts.hours}:{timeParts.minutes}:{timeParts.seconds}
              </div>

              <span className="text-xs sm:text-sm text-cyan-300 font-extrabold tracking-widest uppercase mb-4">
                Hours : Minutes : Seconds
              </span>

              {/* Play / Pause / Reset Action Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={isRunning ? handlePauseTimer : handleResumeTimer}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 hover:from-cyan-300 hover:to-purple-300 text-slate-950 font-black text-sm sm:text-base shadow-xl transition-transform hover:scale-105 flex items-center gap-2"
                >
                  {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  <span>{isRunning ? 'Pause Timer' : 'Start / Resume'}</span>
                </button>

                <button
                  onClick={handleResetTimer}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>

                <button
                  onClick={() => setIsFullScreen(prev => !prev)}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-cyan-300"
                  title="Toggle 16:9 Fullscreen"
                >
                  {isFullScreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
                </button>
              </div>

              {/* Bottom Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-950">
                <div
                  className="h-full bg-cyan-400 transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Motivational Quote */}
            <p className="text-xs sm:text-sm italic text-cyan-200 text-center max-w-lg font-medium">
              {quotes[quoteIndex]}
            </p>

          </div>

          {/* Right Duration Controls, Alarm Tone & Custom Song Upload */}
          <div className="lg:col-span-5 space-y-5 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
            
            <div>
              <h3 className="text-sm font-extrabold text-white mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Select Duration</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {[15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setSelectedDuration(mins);
                      setRemainingSeconds(mins * 60);
                      setIsRunning(false);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      selectedDuration === mins
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-xs ring-1 ring-cyan-400'
                        : 'bg-slate-900/40 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {mins >= 60 ? `${mins / 60} hour${mins > 60 ? 's' : ''}` : `${mins} min`}
                  </button>
                ))}
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDuration(-1);
                    setRemainingSeconds(customMinutes * 60);
                    setIsRunning(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between px-3 ${
                    selectedDuration === -1
                      ? 'bg-cyan-500/20 border-cyan-400 text-white'
                      : 'bg-slate-900/40 border-white/10 text-slate-300'
                  }`}
                >
                  <span>Custom Minutes</span>
                  {selectedDuration === -1 ? (
                    <input
                      type="number"
                      value={customMinutes}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setCustomMinutes(v);
                        setRemainingSeconds(v * 60);
                      }}
                      className="w-16 bg-slate-900 border border-cyan-400 text-white rounded px-2 py-0.5 text-xs text-center"
                    />
                  ) : (
                    <span>{customMinutes} mins</span>
                  )}
                </button>
              </div>
            </div>

            {/* Sound Selector */}
            <div>
              <label className="block text-xs font-extrabold text-white mb-2">Default Alarm Sound</label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedSound}
                  onChange={(e) => setSelectedSound(e.target.value)}
                  className="flex-1 bg-slate-900/80 border border-white/20 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none"
                >
                  {sounds.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={playAlarmSound}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 font-bold text-xs"
                  title="Test Sound"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Completion Alarm Audio File Upload (Req 6) */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <label className="block text-xs font-extrabold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-purple-400" />
                  <span>Completion Music File (Bajes jab timer khatam ho)</span>
                </span>
              </label>

              {customMusicUrl ? (
                <div className="p-3 bg-slate-900/80 rounded-xl border border-purple-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Radio className="w-4 h-4 text-purple-400 animate-pulse shrink-0" />
                    <span className="text-xs font-bold text-slate-200 truncate">{customMusicName}</span>
                  </div>

                  <button
                    onClick={() => {
                      setCustomMusicUrl(null);
                      setCustomMusicName('');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 text-xs font-bold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 bg-slate-900/40 hover:bg-white/5 cursor-pointer text-xs text-slate-300 font-bold transition-all">
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span>Attach Completion Song (.mp3, .wav, .m4a)</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleMusicUpload}
                    className="hidden"
                  />
                </label>
              )}
              <span className="text-[10px] text-slate-400 block italic">
                🎵 Note: Music will play automatically ONLY when timer reaches 0:00!
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
