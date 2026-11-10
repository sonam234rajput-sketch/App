import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Volume2,
  Copy,
  Check,
  Plus,
  Trash2,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  History,
  AlertTriangle,
  Edit3,
  Youtube
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { ChatMessage, ChatSession } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { aiService } from '../../services/aiService';
import { FileUploadBox } from '../common/FileUploadBox';
import { TTSButton } from '../common/TTSButton';
import { ConfirmModal } from '../common/ConfirmModal';
import { VoiceRecorder } from '../common/VoiceRecorder';

export const AiChat: React.FC = () => {
  const { chatSessions, saveChatSession, deleteChatSession, activeYouTubeSession, setActiveYouTubeSession } = useLibrary();
  const { viewerData, setViewerData } = useAuth();

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return chatSessions.length > 0 ? chatSessions[0].id : `chat-${Date.now()}`;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi' | 'Hinglish'>('Hinglish');
  const [selectedPersona, setSelectedPersona] = useState('Friendly Teacher');
  const [attachment, setAttachment] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  // Custom Confirmation Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const welcomeMessage: ChatMessage = {
    id: 'msg-welcome',
    role: 'assistant',
    content: 'Hello! 👋 Main aapka AI Teacher hun. Aap mujhse koi bhi academic sawal poochh sakte ho!',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  useEffect(() => {
    if (viewerData && viewerData.type === 'chat') {
      const session = viewerData.data as ChatSession;
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setViewerData(null);
    }
  }, [viewerData, setViewerData]);

  useEffect(() => {
    const active = chatSessions.find(s => s.id === currentSessionId);
    if (active) {
      setMessages(active.messages);
    } else if (messages.length === 0) {
      setMessages([welcomeMessage]);
    }
  }, [currentSessionId, chatSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachment({
        base64,
        mimeType: file.type || 'image/jpeg',
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const handleRename = async (id: string) => {
    const session = chatSessions.find(s => s.id === id);
    if (session && newTitle.trim()) {
      await saveChatSession({ ...session, title: newTitle.trim() });
      setRenamingId(null);
      setNewTitle('');
    }
  };

  const handleClearAll = async () => {
    triggerConfirm(
      'Clear All Chat History?',
      'क्या आप सभी पुराने चैट सेशन डिलीट करना चाहते हैं? यह क्रिया वापस नहीं लाई जा सकती।',
      async () => {
        for (const session of chatSessions) {
          await deleteChatSession(session.id);
        }
        startNewChat();
      }
    );
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() && !attachment) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...(attachment?.name ? { attachmentName: attachment.name } : {}),
      ...(attachment?.mimeType ? { attachmentType: attachment.mimeType } : {})
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputPrompt('');
    setLoading(true);
    setErrorMessage(null);

    const currentAttachment = attachment;
    setAttachment(null);

    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const data = await aiService.chat(promptToSend, updatedMessages, {
        language: selectedLanguage,
        attachment: currentAttachment,
        signal: controller.signal
      }, {
        youtubeContext: activeYouTubeSession || undefined
      });

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply || 'Problem in understanding. Please retry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);

      const sessionTitle = promptToSend.slice(0, 30) || 'New Chat';
      const currentSession = chatSessions.find(s => s.id === currentSessionId);
      const updatedSession: ChatSession = {
        id: currentSessionId,
        title: currentSession?.title && currentSession.title !== 'New Chat' ? currentSession.title : sessionTitle,
        messages: finalMessages,
        updatedAt: new Date().toISOString()
      };
      await saveChatSession(updatedSession);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMessage(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(`chat-${Date.now()}`);
    setMessages([welcomeMessage]);
    setErrorMessage(null);
  };

  const deleteMessage = async (id: string) => {
    if (messages.length <= 1) {
      startNewChat();
      return;
    }
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    const active = chatSessions.find(s => s.id === currentSessionId);
    if (active) {
      await saveChatSession({ ...active, messages: updated });
    }
  };

  const speakText = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
      utterance.lang = selectedLanguage === 'Hindi' ? 'hi-IN' : 'en-IN';
      utterance.onend = () => setSpeakingId(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
      <div className={`lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between ${showHistorySidebar ? 'fixed inset-0 z-50 lg:relative' : 'hidden lg:flex'}`}>
        <div className="space-y-4 overflow-hidden flex flex-col h-full">
          <div className="flex items-center justify-between lg:hidden">
             <h2 className="font-bold">Chat History</h2>
             <button onClick={() => setShowHistorySidebar(false)} className="p-2">✕</button>
          </div>
          <button onClick={() => { startNewChat(); setShowHistorySidebar(false); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"><Plus className="w-4 h-4" /><span>New Chat</span></button>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2 pt-2">
            {chatSessions.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center py-10">No history</p>
            ) : (
              chatSessions.map(session => (
                <div key={session.id} className={`group flex items-center justify-between p-3 rounded-xl text-xs font-medium cursor-pointer transition-all border ${session.id === currentSessionId ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`} onClick={() => { setCurrentSessionId(session.id); setShowHistorySidebar(false); }}>
                  {renamingId === session.id ? (
                    <input 
                      autoFocus
                      className="bg-white dark:bg-slate-800 border-none outline-none w-full p-0 text-xs"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onBlur={() => handleRename(session.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id)}
                    />
                  ) : (
                    <span className="truncate flex-1">{session.title}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setRenamingId(session.id); setNewTitle(session.title); }} className="p-1 text-slate-400 hover:text-indigo-500 rounded"><Edit3 className="w-3 h-3" /></button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerConfirm(
                          'Delete Chat Session?',
                          `क्या आप चैट Session "${session.title}" को permanently delete करना चाहते हैं?`,
                          () => {
                            deleteChatSession(session.id);
                            if (session.id === currentSessionId) startNewChat();
                          }
                        );
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded cursor-pointer"
                      title="Delete Session"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {chatSessions.length > 0 && (
            <button onClick={handleClearAll} className="w-full py-2 px-3 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center justify-center gap-1.5 transition-colors mt-2 cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          )}
        </div>
      </div>

      <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm relative">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistorySidebar(true)} className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><History className="w-4 h-4" /></button>
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white"><Bot className="w-6 h-6" /></div>
            <div>
              <h3 className="text-sm font-bold">AI Teacher</h3>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-slate-500">Active Mentor</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value as any)} className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none cursor-pointer">
              <option value="Hinglish">Hinglish</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
            </select>
            <button
              onClick={() => {
                triggerConfirm(
                  'Delete Active Chat?',
                  'क्या आप इस चैट की बातचीत डिलीट करके नया चैट शुरू करना चाहते हैं?',
                  () => {
                    deleteChatSession(currentSessionId);
                    startNewChat();
                  }
                );
              }}
              className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Delete Active Chat Thread"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Chat</span>
            </button>
          </div>
        </div>

        {activeYouTubeSession && (
          <div className="px-4 py-2 bg-gradient-to-r from-red-500/10 via-purple-500/10 to-indigo-500/10 border-b border-red-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Youtube className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                Study Context: {activeYouTubeSession.title}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                (AI Teacher referencing video lecture)
              </span>
            </div>
            <button
              onClick={() => setActiveYouTubeSession(null)}
              className="text-[10px] font-bold text-slate-400 hover:text-red-600 shrink-0"
              title="Remove YouTube Context from Chat"
            >
              Clear Context
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role !== 'user' && <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-indigo-600" /></div>}
              <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`p-4 rounded-2xl shadow-sm border ${msg.role === 'user' ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                  {msg.attachmentName && <div className="text-[10px] bg-black/10 p-1.5 rounded-lg mb-2 flex items-center gap-1"><Paperclip className="w-3 h-3" />{msg.attachmentName}</div>}
                  <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown></div>
                </div>
                <div className={`flex items-center gap-3 px-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-slate-400 font-medium">{msg.timestamp}</span>
                  {msg.role !== 'user' && (
                    <TTSButton
                      id={`chat-msg-${msg.id}`}
                      text={msg.content}
                      size="sm"
                      variant="icon"
                    />
                  )}
                  <button
                    onClick={() => {
                      triggerConfirm(
                        'Delete Message?',
                        'क्या आप इस मैसेज को चैट से हटाना चाहते हैं?',
                        () => deleteMessage(msg.id)
                      );
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    title="Delete Message"
                  >
                    <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                    <span className="text-[10px] font-semibold text-slate-400 hover:text-red-500">Delete</span>
                  </button>
                </div>
              </div>
              {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>}
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center animate-pulse"><Bot className="w-4 h-4 text-indigo-600" /></div>
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-slate-500"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 space-y-3">
          {errorMessage && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-[11px] flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" />{errorMessage}</div>}
          
          <FileUploadBox
            attachment={attachment}
            onFileSelect={(file) => setAttachment(file)}
            label="Upload Photo, Video, PDF or Study Doc"
            hint="AI will perform vision OCR, read textbook diagrams, video frames & document text"
          />

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
            <VoiceRecorder onAudioReady={(blob) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                setAttachment({ base64, mimeType: 'audio/webm', name: 'Voice_Message.webm' });
              };
              reader.readAsDataURL(blob);
            }} />
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent outline-none text-sm font-medium px-2 text-slate-900 dark:text-white"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || (!inputPrompt.trim() && !attachment)}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-all flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
