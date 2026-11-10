import React, { useState } from 'react';
import {
  Bookmark,
  Brain,
  FileText,
  MessageSquare,
  FolderPlus,
  Trash2,
  Folder,
  Eye,
  Search,
  Calendar,
  X,
  Copy,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Youtube,
  Play
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { copyToClipboard } from '../../utils/clipboard';
import { useAuth } from '../../context/AuthContext';
import { QuizResult, MindMapData, NoteItem, AnswerEvaluation, ChatSession } from '../../types';
import { TTSButton } from '../common/TTSButton';
import { ConfirmModal } from '../common/ConfirmModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

type FocusedItem = 
  | { type: 'note'; data: NoteItem }
  | { type: 'mindmap'; data: MindMapData }
  | { type: 'quiz'; data: QuizResult }
  | { type: 'evaluation'; data: AnswerEvaluation }
  | null;

export const SavedLibrary: React.FC = () => {
  const {
    quizzes,
    mindmaps,
    notes,
    chatSessions,
    evaluations,
    youtubeSessions,
    setActiveYouTubeSession,
    deleteYouTubeSession,
    deleteQuiz,
    deleteMindMap,
    deleteNote,
    deleteChatSession,
    deleteEvaluation,
    folders,
    addFolder
  } = useLibrary();

  const { setActiveTab, setViewerData } = useAuth();

  const [activeTabMode, setActiveTabMode] = useState<'quizzes' | 'mindmaps' | 'notes' | 'chats' | 'evals' | 'youtube'>('quizzes');
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  
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
  
  // Dedicated Focused Content Reader state
  const [focusedItem, setFocusedItem] = useState<FocusedItem>(null);
  const [mindmapZoom, setMindmapZoom] = useState(1);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      setSelectedFolder(newFolderName.trim());
      setNewFolderName('');
      setShowAddFolderModal(false);
    }
  };

  const handleCopyText = async (text: string) => {
    if (!text) return;
    await copyToClipboard(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Compile mindmap speech
  const getMindMapAudio = (mm: MindMapData): string => {
    let script = `${mm.rootTitle}. `;
    if (mm.summary) script += `${mm.summary} `;
    mm.branches?.forEach((b, i) => {
      script += `Branch ${i + 1}: ${b.title}. ${b.summary || ''} `;
      b.subNodes?.forEach(s => {
        script += `${s.label}. ${s.detail || ''} `;
        if (s.formula) script += `Formula: ${s.formula}. `;
      });
    });
    return script;
  };

  // Compile evaluation speech
  const getEvalAudio = (ev: AnswerEvaluation): string => {
    let script = `Evaluation Report. Marks: ${ev.marksObtained} out of ${ev.maxMarks}. `;
    if (ev.correctPoints?.length) script += `Correct: ${ev.correctPoints.join('. ')}. `;
    if (ev.missingPoints?.length) script += `Missing points: ${ev.missingPoints.join('. ')}. `;
    if (ev.modelAnswer) script += `Model Answer: ${ev.modelAnswer}. `;
    return script;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <Bookmark className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Personal Workspace Library</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold uppercase">
                Private Cloud
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your saved revision notes, interactive concept maps, quizzes, and grading reports
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddFolderModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Folder</span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTabMode('quizzes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTabMode === 'quizzes'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Quizzes ({quizzes.length})
          </button>

          <button
            onClick={() => setActiveTabMode('mindmaps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTabMode === 'mindmaps'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Mind Maps ({mindmaps.length})
          </button>

          <button
            onClick={() => setActiveTabMode('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTabMode === 'notes'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Notes ({notes.length})
          </button>

          <button
            onClick={() => setActiveTabMode('chats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTabMode === 'chats'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Chats ({chatSessions.length})
          </button>

          <button
            onClick={() => setActiveTabMode('evals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTabMode === 'evals'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Evaluations ({evaluations.length})
          </button>

          <button
            onClick={() => setActiveTabMode('youtube')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTabMode === 'youtube'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>YouTube AI ({youtubeSessions.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved content..."
            className="bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none w-full"
          />
        </div>
      </div>

      {/* CONTENT LISTING */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* QUIZZES TAB */}
        {activeTabMode === 'quizzes' && quizzes.map(qz => (
          <div key={qz.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {qz.date}
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                  Class {qz.className}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{qz.title}</h3>

              <div className="flex items-center gap-4 text-xs font-bold pt-1">
                <span className="text-emerald-600 font-black">{qz.percentage}% Score</span>
                <span className="text-slate-500">{qz.correct}/{qz.totalQuestions} Correct</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  triggerConfirm(
                    'Delete Quiz?',
                    `क्या आप इस Quiz "${qz.title}" को permanently delete करना चाहते हैं?`,
                    () => deleteQuiz(qz.id)
                  );
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-xs flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setFocusedItem({ type: 'quiz', data: qz })}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Clean View</span>
              </button>
            </div>
          </div>
        ))}

        {/* MIND MAPS TAB */}
        {activeTabMode === 'mindmaps' && mindmaps.map(mm => (
          <div key={mm.id || mm.rootTitle} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>{mm.date || 'Recent'}</span>
                <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 font-bold">
                  {mm.designStyle || 'Adaptive'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{mm.rootTitle} Mind Map</h3>
              <p className="text-xs text-slate-500">{mm.branches?.length || 0} Concept Branches • Multi-Tier</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  const mmId = mm.id;
                  if (mmId) {
                    triggerConfirm(
                      'Delete Mind Map?',
                      `क्या आप इस Mind Map "${mm.rootTitle}" को permanently delete करना चाहते हैं?`,
                      () => deleteMindMap(mmId)
                    );
                  }
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-xs flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setFocusedItem({ type: 'mindmap', data: mm })}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Clean Map</span>
              </button>
            </div>
          </div>
        ))}

        {/* NOTES TAB */}
        {activeTabMode === 'notes' && notes.map(nt => (
          <div key={nt.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>{nt.createdAt}</span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                  {nt.folder || 'General'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{nt.title}</h3>
              <p className="text-xs text-slate-500">{nt.subject} • Class {nt.className}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  triggerConfirm(
                    'Delete Notes?',
                    `क्या आप इन Notes "${nt.title}" को permanently delete करना चाहते हैं?`,
                    () => deleteNote(nt.id)
                  );
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-xs flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setFocusedItem({ type: 'note', data: nt })}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Read Notes</span>
              </button>
            </div>
          </div>
        ))}

        {/* CHAT ARCHIVES TAB */}
        {activeTabMode === 'chats' && chatSessions.map(cs => (
          <div key={cs.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>{new Date(cs.updatedAt).toLocaleDateString('en-IN')}</span>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold">
                  {cs.messages.length} Messages
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{cs.title}</h3>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  triggerConfirm(
                    'Delete Chat Session?',
                    `क्या आप इस चैट Session "${cs.title}" को permanently delete करना चाहते हैं?`,
                    () => deleteChatSession(cs.id)
                  );
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-xs flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => {
                  setViewerData({ type: 'chat', data: cs });
                  setActiveTab('chat');
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
              >
                Continue Chat
              </button>
            </div>
          </div>
        ))}

        {/* EVALUATIONS TAB */}
        {activeTabMode === 'evals' && evaluations.map(ev => (
          <div key={(ev as any).id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>{ev.date}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                  Score: {ev.marksObtained}/{ev.maxMarks}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{ev.subject} Answer Check</h3>
              <p className="text-xs text-slate-500 line-clamp-2 italic">Q: {ev.extractedQuestion || 'Board Question Evaluation'}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  triggerConfirm(
                    'Delete Answer Report?',
                    `क्या आप इस Answer Report को permanently delete करना चाहते हैं?`,
                    () => deleteEvaluation((ev as any).id)
                  );
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-xs flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setFocusedItem({ type: 'evaluation', data: ev })}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Clean Report</span>
              </button>
            </div>
          </div>
        ))}

        {/* YOUTUBE VIDEO AI ANALYSES TAB */}
        {activeTabMode === 'youtube' && youtubeSessions.map(ys => (
          <div key={ys.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>{new Date(ys.createdAt).toLocaleDateString('en-IN')}</span>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold">
                  {ys.videos.length} Video{ys.videos.length > 1 ? 's' : ''}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                {ys.title}
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {ys.combinedSummary?.overview || 'Comprehensive lecture breakdown with formulas & timestamps.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  triggerConfirm(
                    'Delete YouTube Analysis?',
                    `क्या आप इस YouTube Analysis "${ys.title}" को permanently delete करना चाहते हैं?`,
                    () => deleteYouTubeSession(ys.id)
                  );
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-xs flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => {
                  setActiveYouTubeSession(ys);
                  setActiveTab('youtube');
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open Analysis</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DEDICATED CLEAN CONTENT VIEWER MODAL / FULL-SCREEN READER */}
      {focusedItem && (
        <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-white dark:bg-slate-900 animate-in fade-in duration-150 overflow-hidden">
          <div className="w-full h-full flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFocusedItem(null)}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Library</span>
                </button>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {focusedItem.type === 'note' && `${focusedItem.data.chapter} — ${focusedItem.data.topic}`}
                    {focusedItem.type === 'mindmap' && `${focusedItem.data.rootTitle} Concept Map`}
                    {focusedItem.type === 'quiz' && `${focusedItem.data.title}`}
                    {focusedItem.type === 'evaluation' && `${focusedItem.data.subject} Examination Report`}
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">
                    Focused Distraction-Free Workspace View
                  </p>
                </div>
              </div>

              {/* Action Buttons in Reader */}
              <div className="flex items-center gap-2">
                {/* Note Actions */}
                {focusedItem.type === 'note' && (
                  <>
                    <TTSButton
                      id={`lib-note-${focusedItem.data.id}`}
                      text={focusedItem.data.contentMarkdown}
                      label="Listen Notes"
                      variant="pill"
                      size="sm"
                    />
                    <button
                      onClick={() => handleCopyText(focusedItem.data.contentMarkdown)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedSuccess ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </>
                )}

                {/* MindMap Actions */}
                {focusedItem.type === 'mindmap' && (
                  <>
                    <TTSButton
                      id={`lib-mm-${focusedItem.data.rootTitle}`}
                      text={getMindMapAudio(focusedItem.data)}
                      label="Listen Mind Map"
                      variant="pill"
                      size="sm"
                    />
                    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                      <button onClick={() => setMindmapZoom(prev => Math.max(0.6, prev - 0.15))} className="p-1"><ZoomOut className="w-3.5 h-3.5" /></button>
                      <span className="text-[10px] font-bold w-9 text-center">{Math.round(mindmapZoom * 100)}%</span>
                      <button onClick={() => setMindmapZoom(prev => Math.min(1.8, prev + 0.15))} className="p-1"><ZoomIn className="w-3.5 h-3.5" /></button>
                    </div>
                  </>
                )}

                {/* Evaluation Actions */}
                {focusedItem.type === 'evaluation' && (
                  <TTSButton
                    id="lib-eval-audio"
                    text={getEvalAudio(focusedItem.data)}
                    label="Listen Report"
                    variant="pill"
                    size="sm"
                  />
                )}

                <button
                  onClick={() => setFocusedItem(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: PURE CONTENT ONLY */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              
              {/* NOTE CONTENT */}
              {focusedItem.type === 'note' && (
                <div className="prose dark:prose-invert max-w-none prose-sm md:prose-base leading-relaxed p-6 bg-slate-50/60 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {focusedItem.data.contentMarkdown}
                  </ReactMarkdown>
                </div>
              )}

              {/* MIND MAP CONTENT */}
              {focusedItem.type === 'mindmap' && (
                <div className="flex flex-col items-center space-y-6" style={{ transform: `scale(${mindmapZoom})`, transformOrigin: 'top center' }}>
                  <div className="p-4 px-8 rounded-3xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-black text-lg md:text-xl shadow-lg text-center uppercase tracking-tight">
                    {focusedItem.data.rootTitle}
                  </div>
                  {focusedItem.data.summary && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-cyan-50 dark:bg-cyan-950/30 p-3 rounded-2xl max-w-xl text-center border border-cyan-100">
                      💡 {focusedItem.data.summary}
                    </p>
                  )}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {focusedItem.data.branches?.map((b, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color || '#0284c7' }} />
                            {b.title}
                          </h4>
                          <TTSButton
                            id={`lib-branch-${i}`}
                            text={`${b.title}. ${b.summary || ''} ${b.subNodes?.map(s => s.label).join(', ')}`}
                            size="sm"
                            variant="subtle"
                          />
                        </div>
                        {b.summary && <p className="text-[10px] text-slate-500 italic">{b.summary}</p>}
                        <div className="space-y-1.5 pt-1">
                          {b.subNodes?.map((s, si) => (
                            <div key={si} className="p-2 rounded-xl bg-white dark:bg-slate-800 text-[11px] space-y-0.5 border border-slate-100 dark:border-slate-700/60">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">• {s.label}</span>
                              {s.detail && <span className="text-slate-500 dark:text-slate-400 block pl-3">{s.detail}</span>}
                              {s.formula && <span className="inline-block font-mono text-[9px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded ml-3">📐 {s.formula}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QUIZ CONTENT */}
              {focusedItem.type === 'quiz' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                    <div>
                      <h4 className="font-extrabold text-sm text-indigo-900 dark:text-indigo-200">{focusedItem.data.title}</h4>
                      <p className="text-xs text-slate-500">Recorded Score: {focusedItem.data.correct} / {focusedItem.data.totalQuestions} ({focusedItem.data.percentage}%)</p>
                    </div>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{focusedItem.data.percentage}%</span>
                  </div>

                  <div className="space-y-4">
                    {focusedItem.data.questions?.map((q, qi) => {
                      const userChoice = focusedItem.data.userAnswers ? focusedItem.data.userAnswers[qi] : null;
                      const isCorrect = userChoice === q.correctIndex;
                      return (
                        <div key={qi} className={`p-4 rounded-2xl border ${isCorrect ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50/50 border-slate-200'} space-y-2`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs">Q{qi + 1}. {q.question}</span>
                            <TTSButton
                              id={`lib-quiz-q-${qi}`}
                              text={`Question ${qi + 1}: ${q.question}. Correct Answer: ${q.options[q.correctIndex]}. Explanation: ${q.explanation}`}
                              size="sm"
                              variant="subtle"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border">
                              <span className="text-slate-400 block text-[10px]">Your Answer:</span>
                              <span className={isCorrect ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                                {userChoice !== null && userChoice !== undefined ? `${String.fromCharCode(65 + userChoice)}. ${q.options[userChoice]}` : 'Not attempted'}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
                              <span className="text-emerald-700 block text-[10px] font-bold">Correct Answer:</span>
                              <span className="text-emerald-800 font-bold">
                                {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800 p-2.5 rounded-lg border">
                            💡 <strong>Explanation:</strong> {q.explanation}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EVALUATION REPORT */}
              {focusedItem.type === 'evaluation' && (
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl text-white flex items-center justify-between">
                    <div>
                      <h4 className="text-2xl font-black">{focusedItem.data.marksObtained} / {focusedItem.data.maxMarks}</h4>
                      <p className="text-xs uppercase font-bold opacity-80">{focusedItem.data.subject} Official Assessment</p>
                    </div>
                    <Award className="w-12 h-12 text-amber-300" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 space-y-2">
                      <h5 className="font-extrabold text-xs text-emerald-800 uppercase flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Correct Key Points
                      </h5>
                      <ul className="text-xs space-y-1 pl-4 list-disc text-emerald-950">
                        {focusedItem.data.correctPoints?.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 space-y-2">
                      <h5 className="font-extrabold text-xs text-amber-800 uppercase flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Missing Points
                      </h5>
                      <ul className="text-xs space-y-1 pl-4 list-disc text-amber-950">
                        {focusedItem.data.missingPoints?.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border space-y-3">
                    <h5 className="font-extrabold text-xs uppercase text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Model Answer
                    </h5>
                    <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed p-4 bg-white dark:bg-slate-800 rounded-xl border">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {focusedItem.data.modelAnswer}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* NEW FOLDER MODAL */}
      {showAddFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Workspace Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder Name (e.g. 10th Board Revision)"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddFolderModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

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
