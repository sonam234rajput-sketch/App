import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Send, Loader2 } from 'lucide-react';

interface Props {
  onAudioReady: (blob: Blob) => void;
}

export const VoiceRecorder: React.FC<Props> = ({ onAudioReady }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setPermissionError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support voice recording.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setAudioUrl(null);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      let msg = 'Microphone error.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
        msg = 'Microphone access denied. Please click the "lock" icon in your browser address bar and set Microphone to "Allow".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No microphone found on your device.';
      } else {
        msg = err.message || 'Could not access microphone.';
      }
      setPermissionError(msg);
      // Fallback for immediate feedback
      if (msg.includes('denied')) {
        alert(msg);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button 
            onClick={stopRecording} 
            className="p-2.5 rounded-xl bg-blue-600 text-white animate-pulse border-2 border-blue-400 shadow-lg shadow-blue-500/20"
            title="Stop Recording"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        ) : (
          <button 
            onClick={startRecording} 
            className={`p-2.5 rounded-xl transition-all border ${
              permissionError 
                ? 'bg-red-50 border-red-200 text-red-500' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title="Start Voice Recording"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        {audioUrl && !isRecording && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
            <button 
              onClick={playAudio} 
              className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition-all"
              title="Play Recording"
            >
              <Play className="w-5 h-5 fill-current" />
            </button>
            <button 
              onClick={() => blob && onAudioReady(blob)} 
              className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20"
              title="Send Voice Message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      
      {permissionError && (
        <p className="text-[10px] text-red-500 font-medium max-w-[200px] leading-tight">
          {permissionError}
        </p>
      )}
    </div>
  );
};
