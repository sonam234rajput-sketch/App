import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Bookmark,
  Check,
  Upload,
  AlertTriangle,
  BookOpen,
  Copy,
  Printer,
  ArrowLeft,
  Share2,
  Youtube
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { NoteItem } from '../../types';
import { LanguageSelector } from '../common/LanguageSelector';
import { CustomPromptInput } from '../common/CustomPromptInput';
import { FileUploadBox } from '../common/FileUploadBox';
import { VoiceRecorder } from '../common/VoiceRecorder';
import { TTSButton } from '../common/TTSButton';
import { aiService } from '../../services/aiService';
import { copyToClipboard } from '../../utils/clipboard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const NotesGenerator: React.FC = () => {
  const { saveNote, folders, activeYouTubeSession, setActiveYouTubeSession } = useLibrary();
  const { viewerData, setViewerData, language, setLanguage, setActiveTab } = useAuth();

  const [className, setClassName] = useState('10th');
  const [subject, setSubject] = useState(activeYouTubeSession ? 'YouTube Lecture' : 'Physics');
  const [chapter, setChapter] = useState(activeYouTubeSession ? activeYouTubeSession.title : 'Light Reflection');
  const [topic, setTopic] = useState(
    activeYouTubeSession?.combinedSummary.allTopics?.[0] || 'Spherical Mirrors & Ray Diagrams'
  );
  const [notesType, setNotesType] = useState<'detailed' | 'short' | 'revision' | 'formula' | 'qa'>('detailed');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('General Study');

  const [attachment, setAttachment] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavedView, setIsSavedView] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (viewerData && viewerData.type === 'notes') {
      const nt = viewerData.data as NoteItem;
      setGeneratedMarkdown(nt.contentMarkdown);
      setClassName(nt.className);
      setSubject(nt.subject);
      setChapter(nt.chapter);
      setTopic(nt.topic);
      setIsSavedView(true);
      setViewerData(null);
    }
  }, [viewerData, setViewerData]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
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

  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const handleGenerateNotes = async () => {
    setLoading(true);
    setGeneratedMarkdown(null);
    setSavedSuccess(false);
    setErrorMessage(null);
    setProcessingTime(null);
    setIsSavedView(false);
    const start = Date.now();

    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const data = await aiService.generateNotes({
        className,
        subject,
        chapter,
        topic,
        notesType,
        youtubeContext: activeYouTubeSession || undefined
      }, {
        language: language as any,
        customPrompt,
        attachment,
        signal: controller.signal
      });

      if (data.notes) {
        setGeneratedMarkdown(data.notes);
        setProcessingTime(Math.round((Date.now() - start) / 1000));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMessage(err.message || 'Notes generation failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToWorkspace = () => {
    if (!generatedMarkdown) return;
    saveNote({
      id: `nt-${Date.now()}`,
      title: `${chapter} — ${topic}`,
      subject,
      className,
      chapter,
      topic,
      contentMarkdown: generatedMarkdown,
      createdAt: new Date().toLocaleDateString('en-IN'),
      folder: selectedFolder
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopyNotes = async () => {
    if (!generatedMarkdown) return;
    await copyToClipboard(generatedMarkdown);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-center shadow-md">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Professional Study Notes Generator</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-extrabold uppercase">
                Textbook Pro
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exam-ready structured notes with definitions, formulas, tables, solved examples & audio reader
            </p>
          </div>
        </div>

        {isSavedView && (
          <button
            onClick={() => {
              setIsSavedView(false);
              setActiveTab('library');
            }}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Library</span>
          </button>
        )}
      </div>

      {/* SETUP FORM (Hidden in pure saved view mode) */}
      {!isSavedView && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          {/* Active YouTube Context Banner */}
          {activeYouTubeSession && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-indigo-500/10 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Youtube className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                      YouTube Video Notes
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {activeYouTubeSession.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    High-yield revision notes synthesized directly from this YouTube lecture
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setChapter(activeYouTubeSession.title);
                    setSubject('YouTube Lecture');
                    setTopic(activeYouTubeSession.combinedSummary.allTopics[0] || 'Core Video Topics');
                  }}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50"
                >
                  Sync Video Details
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Class / Standard</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <LanguageSelector language={language} onChange={setLanguage} />

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Library Folder</label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chapter Name *</label>
              </div>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g. Light Reflection and Refraction"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Topic / Key Focus *</label>
              </div>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Spherical Mirrors, Mirror Formula & Sign Convention"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Study Note Format Style</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'detailed', label: '📖 Comprehensive Textbook', desc: 'Full theory, derivations & examples' },
                { id: 'short', label: '⚡ Quick Exam Revision', desc: 'High-yield points & quick formulas' },
                { id: 'formula', label: '📐 Formula & Law Sheet', desc: 'All equations, SI units & tables' },
                { id: 'qa', label: '🎯 Top Board Q&A Style', desc: 'Frequently asked exam questions' },
                { id: 'revision', label: '🔥 Last Minute Cheat Sheet', desc: 'Bullet summaries & traps' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setNotesType(type.id as any)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    notesType === type.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-600 text-indigo-900 dark:text-indigo-200 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold">{type.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reusable Custom Instructions Component */}
          <CustomPromptInput
            value={customPrompt}
            onChange={setCustomPrompt}
            placeholder="e.g. NCERT syllabus अनुसार, महत्वपूर्ण उदाहरण और फॉर्मूले शामिल करो..."
          />

          <FileUploadBox
            attachment={attachment}
            onFileSelect={(file) => setAttachment(file)}
            label="Upload Textbook Photo, PDF or Study Doc (Optional)"
            hint="AI will perform deep OCR vision, formula extraction & section analysis"
          />

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Or Record Voice Notes (Optional)</label>
            <VoiceRecorder onAudioReady={(blob) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                setAttachment({ base64, mimeType: 'audio/webm', name: 'Voice_Note.webm' });
              };
              reader.readAsDataURL(blob);
            }} />
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            onClick={handleGenerateNotes}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:opacity-95 text-white font-black text-sm shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>Authoring Textbook Notes...</span>
              </>
            ) : (
              <>
                <BookOpen className="w-5 h-5" />
                <span>Generate Professional Study Notes ✨</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* NOTES DISPLAY AREA */}
      {generatedMarkdown && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          
          {/* Notes Top Actions Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {chapter} — {topic}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {subject} • Class {className}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">
                  {notesType} Mode
                </span>
                {processingTime && (
                  <span className="text-[10px] font-bold text-slate-400">
                    ⚡ Prepared in {processingTime}s
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons: TTS, Copy, Print, Save */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Speaker Audio Button */}
              <TTSButton
                id={`notes-audio-${chapter}-${topic}`}
                text={generatedMarkdown}
                label="Listen Notes (Audio)"
                variant="pill"
                size="sm"
              />

              <button
                onClick={handleCopyNotes}
                title="Copy Notes Text"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedSuccess ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handlePrint}
                title="Print Notes"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <button
                onClick={handleSaveToWorkspace}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span>{savedSuccess ? 'Saved in Library!' : 'Save to Library'}</span>
              </button>
            </div>
          </div>

          {/* Formatted Markdown Body with custom textbook styling */}
          <div className="prose dark:prose-invert max-w-none prose-sm md:prose-base leading-relaxed p-6 sm:p-8 bg-slate-50/70 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 custom-scrollbar">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h1: ({ node, ...props }) => <h1 className="text-2xl font-black text-indigo-700 dark:text-indigo-400 border-b border-indigo-200 pb-2 mb-4 mt-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-6 mb-3 flex items-center gap-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2" {...props} />,
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <table className="w-full text-xs text-left border-collapse" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => <th className="bg-indigo-100 dark:bg-indigo-950/80 p-2.5 font-bold text-indigo-900 dark:text-indigo-200 border-b border-indigo-200 dark:border-indigo-800" {...props} />,
                td: ({ node, ...props }) => <td className="p-2.5 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 my-3 rounded-r-xl text-amber-900 dark:text-amber-200 text-xs italic not-italic" {...props} />
                ),
                code: ({ node, className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px]" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto my-3" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {generatedMarkdown}
            </ReactMarkdown>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>📚 AarohAI Verified Academic Notes • Curriculum Aligned</span>
            <span>Created for {className}th standard</span>
          </div>
        </div>
      )}
    </div>
  );
};
