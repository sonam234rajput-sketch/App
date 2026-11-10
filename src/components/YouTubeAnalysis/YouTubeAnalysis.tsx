import React, { useState, useRef, useEffect } from 'react';
import {
  Youtube,
  Plus,
  Trash2,
  Sparkles,
  Play,
  Clock,
  BookOpen,
  FileText,
  Brain,
  MessageSquare,
  CheckSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Share2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Layers,
  ArrowRight,
  RefreshCw,
  Library
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { YouTubeAnalysisSession, SingleVideoAnalysis, YouTubeTimestampItem } from '../../types';
import { LanguageSelector } from '../common/LanguageSelector';
import { aiService } from '../../services/aiService';

function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const parts = ts.trim().split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const cleaned = url.trim();

  // Match 11-char video ID across watch, shorts, live, embed, v, youtu.be, m.youtube.com
  const match = cleaned.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (match && match[1]) {
    return match[1];
  }

  // Fallback query string check
  try {
    const urlObj = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && vParam.length === 11) {
      return vParam;
    }
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    for (const part of pathParts) {
      if (part.length === 11 && !['watch', 'shorts', 'live', 'embed', 'v'].includes(part.toLowerCase())) {
        return part;
      }
    }
  } catch (_) {}

  return null;
}

export const YouTubeAnalysis: React.FC = () => {
  const { language, setLanguage, setActiveTab } = useAuth();
  const {
    youtubeSessions,
    activeYouTubeSession,
    setActiveYouTubeSession,
    saveYouTubeSession,
    deleteYouTubeSession
  } = useLibrary();

  const [urls, setUrls] = useState<string[]>(['']);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Active view tab inside analysis report
  const [selectedVideoTab, setSelectedVideoTab] = useState<'combined' | number>('combined');
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Auto select active session tab when session updates
  useEffect(() => {
    if (activeYouTubeSession) {
      if (activeYouTubeSession.videos.length > 1) {
        setSelectedVideoTab('combined');
      } else {
        setSelectedVideoTab(0);
      }
    }
  }, [activeYouTubeSession?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAddUrl = () => {
    if (urls.length < 5) {
      setUrls([...urls, '']);
    }
  };

  const handleRemoveUrl = (index: number) => {
    if (urls.length > 1) {
      const updated = urls.filter((_, i) => i !== index);
      setUrls(updated);
    } else {
      setUrls(['']);
    }
  };

  const handleUrlChange = (index: number, val: string) => {
    const updated = [...urls];
    updated[index] = val;
    setUrls(updated);
    setErrorMessage(null);
  };

  const validateUrls = (): { valid: boolean; error?: string; cleanedList: string[] } => {
    const cleaned = urls.map(u => u.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      return { valid: false, error: 'Please enter at least one YouTube video link.', cleanedList: [] };
    }
    if (cleaned.length > 5) {
      return { valid: false, error: 'Maximum 5 YouTube videos can be analyzed simultaneously.', cleanedList: [] };
    }

    const seenIds = new Set<string>();
    for (const u of cleaned) {
      const vid = extractVideoId(u);
      if (!vid) {
        return {
          valid: false,
          error: `"${u}" is not a valid YouTube link. Please paste a standard YouTube video or shorts URL.`,
          cleanedList: []
        };
      }
      if (seenIds.has(vid)) {
        return {
          valid: false,
          error: `Duplicate video link detected (${vid}). Please remove repeated URLs.`,
          cleanedList: []
        };
      }
      seenIds.add(vid);
    }

    return { valid: true, cleanedList: cleaned };
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
    setAnalysisStep('');
    setErrorMessage('Analysis cancelled by user.');
  };

  const handleAnalyze = async () => {
    if (isAnalyzing) return; // Prevent duplicate execution
    setErrorMessage(null);
    setSuccessMessage(null);

    const check = validateUrls();
    if (!check.valid || !check.cleanedList.length) {
      setErrorMessage(check.error || 'Please provide valid YouTube URLs.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('Step 1/4: Initializing & verifying video links...');

    let stepTimer: any = null;
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      stepTimer = setInterval(() => {
        setAnalysisStep((prev) => {
          if (prev.includes('Step 1')) return 'Step 2/4: Sending request to Gemini 3.8 Flash AI...';
          if (prev.includes('Step 2')) return 'Step 3/4: Analyzing lecture content, timestamps & formulas...';
          if (prev.includes('Step 3')) return 'Step 4/4: Finalizing & saving master study report...';
          return prev;
        });
      }, 2000);

      const res = await aiService.analyzeYouTubeVideos(
        check.cleanedList,
        {
          language: language as any,
          customPrompt: customInstructions,
          signal: controller.signal
        }
      );

      if (res && res.session) {
        const session: YouTubeAnalysisSession = res.session;
        await saveYouTubeSession(session);
        setActiveYouTubeSession(session);
        if (session.videos.length > 1) {
          setSelectedVideoTab('combined');
        } else {
          setSelectedVideoTab(0);
        }
        setSuccessMessage('YouTube Video Analysis complete! Study material generated.');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        throw new Error('Analysis report could not be generated. Please check video availability.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        setErrorMessage('Analysis cancelled.');
        return;
      }
      console.error('[YouTube Analyze Catch]', err);
      setErrorMessage(err.message || 'Video analysis failed. Please verify the video is public and try again.');
    } finally {
      if (stepTimer) clearInterval(stepTimer);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Navigations to Study Suite with context preloaded
  const handleLaunchQuiz = () => {
    if (!activeYouTubeSession) return;
    setActiveTab('quiz');
  };

  const handleLaunchNotes = () => {
    if (!activeYouTubeSession) return;
    setActiveTab('notes');
  };

  const handleLaunchMindMap = () => {
    if (!activeYouTubeSession) return;
    setActiveTab('mindmap');
  };

  const handleLaunchChat = () => {
    if (!activeYouTubeSession) return;
    setActiveTab('chat');
  };

  const handleLaunchAnswerChecker = () => {
    if (!activeYouTubeSession) return;
    setActiveTab('answer-checker');
  };

  const handleCopySummary = () => {
    if (!activeYouTubeSession) return;
    const activeVid = typeof selectedVideoTab === 'number' ? activeYouTubeSession.videos[selectedVideoTab] : null;
    let textToCopy = '';

    if (activeVid) {
      textToCopy = `=== ${activeVid.title} ===\nChannel: ${activeVid.channelTitle || 'Teacher'}\nURL: ${activeVid.url}\n\nTopics:\n- ${activeVid.topicsCovered.join('\n- ')}\n\nDefinitions:\n${activeVid.keyDefinitions.map(d => `• ${d.term}: ${d.definition} [${d.timestamp || 'video'}]`).join('\n')}\n\nFormulas:\n${activeVid.importantFormulas.map(f => `• ${f.formula} (${f.context})`).join('\n')}\n\nHindi Explanation:\n${activeVid.hindiSimplifiedSummary}\n\nPotential Exam Questions:\n${activeVid.potentialQuestions.map((q, i) => `${i + 1}. ${q.question}\nAns: ${q.answerSummary}`).join('\n\n')}`;
    } else {
      textToCopy = `=== YOUTUBE MASTER STUDY SYNTHESIS ===\nSession: ${activeYouTubeSession.title}\nVideos: ${activeYouTubeSession.videoUrls.join(', ')}\n\nOverview:\n${activeYouTubeSession.combinedSummary.overview}\n\nAll Topics:\n- ${activeYouTubeSession.combinedSummary.allTopics.join('\n- ')}\n\nExam Master Checklist:\n- ${activeYouTubeSession.combinedSummary.examMasterChecklist.join('\n- ')}\n\nHindi Overview:\n${activeYouTubeSession.combinedSummary.hindiOverview}`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const currentDisplayVideo: SingleVideoAnalysis | null =
    activeYouTubeSession && typeof selectedVideoTab === 'number' && activeYouTubeSession.videos[selectedVideoTab]
      ? activeYouTubeSession.videos[selectedVideoTab]
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md">
            <Youtube className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                YouTube Video AI Analysis
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                Multimodal 3.8
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analyze public YouTube educational lectures into timestamps, formulas, exam questions & notes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              showHistory
                ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>History ({youtubeSessions.length})</span>
          </button>
        </div>
      </div>

      {/* History Drawer / Modal */}
      {showHistory && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-red-600" />
              <span>Previously Analyzed YouTube Videos</span>
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
            >
              Close
            </button>
          </div>

          {youtubeSessions.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
              No saved analyses yet. Paste a YouTube lecture link below to generate your first study report!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {youtubeSessions.map(session => (
                <div
                  key={session.id}
                  className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between gap-3 ${
                    activeYouTubeSession?.id === session.id
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {session.videos.length} video{session.videos.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(session.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                      {session.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setActiveYouTubeSession(session);
                        setShowHistory(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Open Study Report</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteYouTubeSession(session.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                      title="Delete Analysis"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INPUT SYSTEM CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Enter Public YouTube Video Link(s)</span>
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                1 to 5 Videos Supported
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Paste standard YouTube video URLs (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)
            </p>
          </div>

          <div className="w-48">
            <LanguageSelector language={language} onChange={setLanguage} />
          </div>
        </div>

        {/* Dynamic URL Inputs */}
        <div className="space-y-3">
          {urls.map((url, index) => {
            const vid = extractVideoId(url);
            const isDuplicate = Boolean(
              vid && urls.filter((u, i) => i !== index && extractVideoId(u) === vid).length > 0
            );
            const isValid = Boolean(vid && !isDuplicate);

            return (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Youtube className={`w-4 h-4 ${url ? 'text-red-600' : 'text-slate-400'}`} />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder={`YouTube Video Link #${index + 1} (e.g. https://www.youtube.com/watch?v=...)`}
                    className={`w-full pl-9 pr-24 py-2.5 rounded-xl border text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white transition-all ${
                      url && isValid
                        ? 'border-emerald-400 dark:border-emerald-600 focus:ring-2 focus:ring-emerald-500'
                        : url && isDuplicate
                        ? 'border-amber-400 dark:border-amber-600 focus:ring-2 focus:ring-amber-500'
                        : url
                        ? 'border-rose-300 dark:border-rose-700'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  {/* Status Badge in Input */}
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {url ? (
                      isValid ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{vid}</span>
                        </span>
                      ) : isDuplicate ? (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Duplicate</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Invalid URL</span>
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-slate-400">Video {index + 1}</span>
                    )}
                  </div>
                </div>

                {urls.length > 1 && (
                  <button
                    onClick={() => handleRemoveUrl(index)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Remove this video link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Another Link Button */}
        {urls.length < 5 && (
          <button
            onClick={handleAddUrl}
            className="px-3.5 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add Another Video Link ({urls.length}/5)</span>
          </button>
        )}

        {/* Custom Focus Instructions */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Optional Academic Focus / मनचाहे निर्देश
          </label>
          <input
            type="text"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. Focus on numerical derivations & board exam questions, or explain in simple Hindi analogies..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
          />
        </div>

        {/* Error / Success Notices */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={handleAnalyze}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Analysis</span>
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Real Step Status Box */}
        {isAnalyzing && (
          <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-red-800 dark:text-red-300">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                <span>{analysisStep || 'Step 1/4: Analyzing YouTube video content...'}</span>
              </span>
              <button
                onClick={handleCancelAnalysis}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
              >
                Cancel Analysis
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Extracting multimodal teacher explanations, formulas & timestamp index. Please wait...
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing YouTube Educational Lecture(s)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Analyze Videos & Build Study Materials (AI विश्लेषण करें)</span>
            </>
          )}
        </button>
      </div>

      {/* ANALYSIS REPORT & STUDY SUITE */}
      {activeYouTubeSession && (
        <div className="space-y-6">
          {/* Active Context Banner with Direct Actions */}
          <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-indigo-700/50 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                    <Youtube className="w-3 h-3 fill-current" />
                    <span>Active Study Context Loaded</span>
                  </span>
                  <span className="text-xs text-indigo-200">
                    {activeYouTubeSession.videos.length} Video{activeYouTubeSession.videos.length > 1 ? 's' : ''} Analyzed
                  </span>
                </div>
                <h2 className="text-lg font-black text-white line-clamp-1">
                  {activeYouTubeSession.title}
                </h2>
                <p className="text-xs text-indigo-200 max-w-2xl">
                  {activeYouTubeSession.combinedSummary.overview}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <button
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all border border-white/10"
                >
                  {copiedNotice ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNotice ? 'Copied!' : 'Copy Summary'}</span>
                </button>
              </div>
            </div>

            {/* INTEGRATED ACTION SUITE BUTTONS */}
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Result Dashboard — AI Tools Connected to Video:</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-[11px] font-bold text-indigo-200 hover:text-white underline cursor-pointer"
                  >
                    Back to Video Input
                  </button>
                  <span className="text-indigo-400">•</span>
                  <button
                    onClick={() => setActiveTab('home')}
                    className="text-[11px] font-bold text-indigo-200 hover:text-white underline cursor-pointer"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* 1. Ask AI Chat */}
                <button
                  onClick={handleLaunchChat}
                  className="p-3 rounded-xl bg-white/10 hover:bg-emerald-600 border border-white/10 hover:border-emerald-400 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <MessageSquare className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-xs font-bold text-white">Ask AI Chat</div>
                  <div className="text-[10px] text-indigo-200">Doubt solver for video</div>
                </button>

                {/* 2. Generate Quiz */}
                <button
                  onClick={handleLaunchQuiz}
                  className="p-3 rounded-xl bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <BookOpen className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-xs font-bold text-white">Generate Quiz</div>
                  <div className="text-[10px] text-indigo-200">MCQs from video</div>
                </button>

                {/* 3. Generate Notes */}
                <button
                  onClick={handleLaunchNotes}
                  className="p-3 rounded-xl bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <FileText className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-xs font-bold text-white">Generate Notes</div>
                  <div className="text-[10px] text-indigo-200">Revision notes & formulas</div>
                </button>

                {/* 4. Generate Mind Map */}
                <button
                  onClick={handleLaunchMindMap}
                  className="p-3 rounded-xl bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Brain className="w-4 h-4 text-pink-300 group-hover:scale-110 transition-transform" />
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-xs font-bold text-white">Generate Mind Map</div>
                  <div className="text-[10px] text-indigo-200">Visual concept map</div>
                </button>

                {/* 5. Check My Answer */}
                <button
                  onClick={handleLaunchAnswerChecker}
                  className="p-3 rounded-xl bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <CheckSquare className="w-4 h-4 text-yellow-300 group-hover:scale-110 transition-transform" />
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-xs font-bold text-white">Check My Answer</div>
                  <div className="text-[10px] text-indigo-200">Grade answer vs video</div>
                </button>

                {/* 6. View Complete Analysis */}
                <button
                  onClick={() => {
                    const el = document.getElementById('youtube-full-report-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-3 rounded-xl bg-white/10 hover:bg-rose-600 border border-white/10 hover:border-rose-400 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Youtube className="w-4 h-4 text-red-400 fill-current group-hover:scale-110 transition-transform" />
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-xs font-bold text-white">View Complete Analysis</div>
                  <div className="text-[10px] text-indigo-200">Timestamps & Report</div>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Combined vs Individual Videos) */}
          <div id="youtube-full-report-section" className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
            {activeYouTubeSession.videos.length > 1 && (
              <button
                onClick={() => setSelectedVideoTab('combined')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedVideoTab === 'combined'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Combined Study Synthesis</span>
              </button>
            )}

            {activeYouTubeSession.videos.map((vid, idx) => (
              <button
                key={vid.videoId || idx}
                onClick={() => setSelectedVideoTab(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedVideoTab === idx
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>Video {idx + 1}: {vid.title.substring(0, 24)}...</span>
              </button>
            ))}
          </div>

          {/* TAB 1: COMBINED STUDY SYNTHESIS */}
          {selectedVideoTab === 'combined' && (
            <div className="space-y-6">
              {/* Overview & Hindi Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Master Synthesis Overview</span>
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {activeYouTubeSession.combinedSummary.overview}
                  </p>

                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      All Topics Covered Across Videos:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeYouTubeSession.combinedSummary.allTopics.map((top, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-100 dark:border-indigo-900/50"
                        >
                          {top}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl p-5 border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>आसान हिंदी में मास्टर व्याख्या (Simplified Hindi)</span>
                  </h3>
                  <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90 whitespace-pre-line font-medium">
                    {activeYouTubeSession.combinedSummary.hindiOverview}
                  </p>
                </div>
              </div>

              {/* Master Exam Checklist & Core Takeaways */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>High-Yield Board Exam Checklist</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {activeYouTubeSession.combinedSummary.examMasterChecklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-purple-600" />
                    <span>Core Facts & Takeaways</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {activeYouTubeSession.combinedSummary.coreTakeaways.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Formulas across all videos */}
              {activeYouTubeSession.combinedSummary.allFormulas.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <span>All Important Formulas & Scientific Laws</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeYouTubeSession.combinedSummary.allFormulas.map((f, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1"
                      >
                        <div className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {f.formula}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {f.context}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INDIVIDUAL VIDEO DEEP REPORT */}
          {currentDisplayVideo && (
            <div className="space-y-6">
              {/* Video Header Card with Watch Link */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                    <img
                      src={`https://img.youtube.com/vi/${currentDisplayVideo.videoId}/hqdefault.jpg`}
                      alt={currentDisplayVideo.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <a
                      href={`https://www.youtube.com/watch?v=${currentDisplayVideo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-colors text-white"
                      title="Watch on YouTube"
                    >
                      <Play className="w-8 h-8 fill-red-600 text-red-600" />
                    </a>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                        {currentDisplayVideo.channelTitle || 'Educational Teacher'}
                      </span>
                      <span className="text-xs text-slate-400">
                        ID: {currentDisplayVideo.videoId}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2">
                      {currentDisplayVideo.title}
                    </h3>
                  </div>
                </div>

                <a
                  href={`https://www.youtube.com/watch?v=${currentDisplayVideo.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all self-end md:self-auto shrink-0 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Video in YouTube</span>
                </a>
              </div>

              {/* Topics Covered */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Topics Taught in this Lecture:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentDisplayVideo.topicsCovered.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Timestamp Navigation Index */}
              {currentDisplayVideo.timestamps && currentDisplayVideo.timestamps.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>Lecture Timestamps & Chapter Index</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">Click to jump in YouTube</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {currentDisplayVideo.timestamps.map((ts, i) => {
                      const secs = parseTimestampToSeconds(ts.timestamp);
                      const jumpUrl = `https://youtu.be/${currentDisplayVideo.videoId}?t=${secs}`;
                      return (
                        <a
                          key={i}
                          href={jumpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-800 transition-all text-left flex items-start gap-2.5 group"
                        >
                          <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            {ts.timestamp}
                          </span>
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {ts.topic}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {ts.summary}
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Simplified Hindi Explanation */}
              <div className="bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl p-5 border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-2">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>आसान हिंदी में पूरा सारांश (Simplified Hindi Explanation)</span>
                </h4>
                <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90 font-medium whitespace-pre-line">
                  {currentDisplayVideo.hindiSimplifiedSummary}
                </p>
              </div>

              {/* Key Definitions & Core Concepts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Definitions */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Important Definitions Taught</span>
                  </h4>
                  <div className="space-y-3">
                    {currentDisplayVideo.keyDefinitions.map((def, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">
                            {def.term}
                          </span>
                          {def.timestamp && (
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              @{def.timestamp}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {def.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Core Concepts */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span>Core Concepts & Principles</span>
                  </h4>
                  <div className="space-y-3">
                    {currentDisplayVideo.keyConcepts.map((conc, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-700 dark:text-purple-400">
                            {conc.concept}
                          </span>
                          {conc.timestamp && (
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              @{conc.timestamp}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {conc.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Teacher Examples & Formulas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Teacher Examples */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Teacher's Examples & Analogies</span>
                  </h4>
                  <div className="space-y-3">
                    {currentDisplayVideo.teacherExamples.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {ex.title}
                          </span>
                          {ex.timestamp && (
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              @{ex.timestamp}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {ex.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulas */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Formulas, Laws & Equations</span>
                  </h4>
                  {currentDisplayVideo.importantFormulas.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">No specific formulas in this conceptual video.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {currentDisplayVideo.importantFormulas.map((f, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                              {f.formula}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              {f.context}
                            </div>
                          </div>
                          {f.timestamp && (
                            <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                              @{f.timestamp}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Potential Exam Questions */}
              {currentDisplayVideo.potentialQuestions && currentDisplayVideo.potentialQuestions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-amber-600" />
                    <span>Probable Board & Exam Questions from this Video</span>
                  </h4>

                  <div className="space-y-2.5">
                    {currentDisplayVideo.potentialQuestions.map((q, i) => {
                      const isExpanded = expandedQuestionIdx === i;
                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedQuestionIdx(isExpanded ? null : i)}
                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between gap-3 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                                Q{i + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {q.question}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
                              <span className="font-bold text-slate-900 dark:text-white">
                                Model Answer Summary:
                              </span>
                              <p>{q.answerSummary}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
