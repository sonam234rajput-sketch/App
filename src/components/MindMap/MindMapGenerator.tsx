import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bookmark,
  Check,
  Palette,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Download,
  Youtube,
  Search,
  BookOpen,
  Compass,
  Award,
  Filter,
  Printer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { MindMapData, DeepMindMapNode, MindMapTemplateId } from '../../types';
import { LanguageSelector } from '../common/LanguageSelector';
import { CustomPromptInput } from '../common/CustomPromptInput';
import { FileUploadBox } from '../common/FileUploadBox';
import { TTSButton } from '../common/TTSButton';
import { aiService } from '../../services/aiService';
import { MINDMAP_TEMPLATES } from './templateDefinitions';
import { TemplateRendererDispatcher } from './MindMapVisualRenderers';
import { NodeDetailModal } from './NodeDetailModal';

export const MindMapGenerator: React.FC = () => {
  const { saveMindMap, activeYouTubeSession, setActiveYouTubeSession } = useLibrary();
  const { viewerData, setViewerData, language, setLanguage, setActiveTab } = useAuth();

  const [chapterName, setChapterName] = useState(activeYouTubeSession ? activeYouTubeSession.title : 'Electric Charges and Fields');
  const [className, setClassName] = useState('Class 12');
  const [subject, setSubject] = useState(activeYouTubeSession ? 'YouTube Lecture' : 'Physics');
  const [boardOrExam, setBoardOrExam] = useState('CBSE Board / NCERT');
  const [learningLevel, setLearningLevel] = useState('Advanced');
  const [selectedTemplateId, setSelectedTemplateId] = useState<MindMapTemplateId>('hierarchical');
  const [activeTabCategory, setActiveTabCategory] = useState<'All' | 'Structural' | 'Mathematical' | 'Analytical' | 'Exam & Roadmap'>('All');

  const [inputText, setInputText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('Step 1/5: Performing AI Deep Research on chapter concepts...');
  const [mindmapData, setMindmapData] = useState<MindMapData | null>(null);
  const [isSavedView, setIsSavedView] = useState(false);

  // Inspector Modal state
  const [selectedNodeForDetail, setSelectedNodeForDetail] = useState<DeepMindMapNode | null>(null);

  // Search filter
  const [searchFilter, setSearchFilter] = useState('');

  // Zoom level
  const [zoomLevel, setZoomLevel] = useState(1);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);

  const RESEARCH_STAGES = [
    { label: 'Chapter Analysis', desc: 'Analyzing chapter syllabus & board exam scope...', targetPct: 15 },
    { label: 'Topic & Subtopic Extraction', desc: 'Extracting main topics & 4–6 level subtopic hierarchy...', targetPct: 35 },
    { label: 'Deep Concept Research', desc: 'Deep researching core concepts, definitions & scientific laws...', targetPct: 55 },
    { label: 'Formula & Derivation Collection', desc: 'Collecting mathematical formulas, LaTeX equations & derivations...', targetPct: 75 },
    { label: 'Examples & Exam Tips', desc: 'Synthesizing NCERT board tips, numerical strategies & pitfalls...', targetPct: 90 },
    { label: 'Structure & Render', desc: 'Structuring 16-template visual map & rendering cards...', targetPct: 99 }
  ];

  // Load saved mindmap if coming from library
  useEffect(() => {
    if (viewerData && viewerData.type === 'mindmap') {
      const mm = viewerData.data as MindMapData;
      setMindmapData(mm);
      setChapterName(mm.rootTitle);
      setClassName(mm.className || 'Class 12');
      setSubject(mm.subject || 'Physics');
      if (mm.templateId) {
        setSelectedTemplateId(mm.templateId as MindMapTemplateId);
      }
      setIsSavedView(true);
      setViewerData(null);
    }
  }, [viewerData, setViewerData]);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (direction === 'in') setZoomLevel(prev => Math.min(prev + 0.15, 1.8));
    else if (direction === 'out') setZoomLevel(prev => Math.max(prev - 0.15, 0.5));
    else setZoomLevel(1);
  };

  const [attachment, setAttachment] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const handleCancelMindMap = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setErrorMessage('Mind map generation cancelled by user.');
  };

  // Shortcut preset test function for Class 12 Physics Electric Charges & Fields
  const loadClass12PhysicsPreset = () => {
    setChapterName('Electric Charges and Fields');
    setClassName('Class 12');
    setSubject('Physics');
    setBoardOrExam('CBSE Board / NCERT');
    setLearningLevel('Competitive (JEE/NEET)');
    setSelectedTemplateId('hierarchical');
    setInputText('Electric charge and its properties, Conductors and insulators, Charging methods, Coulomb\'s law, Principle of superposition, Electric field, Electric field lines, Electric dipole, Electric dipole moment, Electric field due to dipole, Torque on electric dipole, Electric flux, Gauss\'s law and applications, Important derivations.');
  };

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setMindmapData(null);
    setSavedSuccess(false);
    setErrorMessage(null);
    setProcessingTime(null);
    setIsSavedView(false);
    setElapsedSeconds(0);
    setProgressPercent(2);
    setCurrentStageIndex(0);
    setGenerationStep(RESEARCH_STAGES[0].desc);
    const start = Date.now();

    let stepTimer: any = null;
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      stepTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        setElapsedSeconds(elapsed);

        // Calculate progress percentage and stage based on elapsed time within 170s budget
        let stageIdx = 0;
        let pct = 5;

        if (elapsed >= 155) {
          stageIdx = 5;
          pct = Math.min(99, 90 + Math.floor(((elapsed - 155) / 15) * 9));
        } else if (elapsed >= 125) {
          stageIdx = 4;
          pct = 75 + Math.floor(((elapsed - 125) / 30) * 15);
        } else if (elapsed >= 85) {
          stageIdx = 3;
          pct = 55 + Math.floor(((elapsed - 85) / 40) * 20);
        } else if (elapsed >= 45) {
          stageIdx = 2;
          pct = 35 + Math.floor(((elapsed - 45) / 40) * 20);
        } else if (elapsed >= 15) {
          stageIdx = 1;
          pct = 15 + Math.floor(((elapsed - 15) / 30) * 20);
        } else {
          stageIdx = 0;
          pct = Math.floor((elapsed / 15) * 15);
        }

        setCurrentStageIndex(stageIdx);
        setProgressPercent(Math.min(99, Math.max(5, pct)));
        setGenerationStep(RESEARCH_STAGES[stageIdx].desc);
      }, 1000);

      // Async post call to server - up to 170s budget
      const data = await aiService.generateMindMap(
        chapterName,
        selectedTemplateId,
        {
          language: language as any,
          customPrompt,
          attachment,
          signal: controller.signal
        },
        {
          className,
          subject,
          boardOrExam,
          learningLevel,
          templateId: selectedTemplateId,
          inputText,
          youtubeContext: activeYouTubeSession || undefined
        }
      );

      // Immediate response handling (whether completed in 15s, 35s, 80s or 160s)
      if (data.mindmap) {
        setProgressPercent(100);
        setCurrentStageIndex(5);
        setMindmapData({
          ...data.mindmap,
          subject,
          className,
          boardOrExam,
          learningLevel,
          templateId: selectedTemplateId,
          date: new Date().toLocaleDateString('en-IN')
        });
        setProcessingTime(Math.round((Date.now() - start) / 1000));
      } else {
        throw new Error('Mind map structure could not be parsed. Please try again.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        setErrorMessage('Mind map generation cancelled by user.');
        return;
      }
      console.error('[MindMap Catch]', err);
      setErrorMessage(err.message || 'Mind Map generation failed. Please check network connection and retry.');
    } finally {
      if (stepTimer) clearInterval(stepTimer);
      setLoading(false);
    }
  };

  const handleSaveToWorkspace = () => {
    if (!mindmapData) return;
    saveMindMap(mindmapData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Compile full mind map audio text for master speaker button
  const getFullAudioScript = (): string => {
    if (!mindmapData) return '';
    let script = `${mindmapData.rootTitle}. `;
    if (mindmapData.summary) {
      script += `${mindmapData.summary} `;
    }
    mindmapData.branches.forEach((b, idx) => {
      script += `Section ${idx + 1}: ${b.title}. `;
      if (b.summary) script += `${b.summary} `;
      b.subNodes.forEach((s) => {
        script += `${s.label}. ${s.detail || ''} `;
        if (s.formula) script += `Formula: ${s.formula}. `;
        if (s.keyPoints && s.keyPoints.length > 0) {
          script += `Points: ${s.keyPoints.join(', ')}. `;
        }
      });
    });
    return script;
  };

  // Print PDF export trigger
  const handlePrintPDF = () => {
    window.print();
  };

  const filteredTemplates = MINDMAP_TEMPLATES.filter(
    t => activeTabCategory === 'All' || t.category === activeTabCategory
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Node Detail Inspector Modal */}
      <NodeDetailModal
        node={selectedNodeForDetail}
        onClose={() => setSelectedNodeForDetail(null)}
      />

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>AarohAI Advanced Mind Map Architect</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black tracking-wide uppercase">
                16 Templates + Deep AI
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exhaustive chapter deep-research with 4–6 level node hierarchy, LaTeX formulas, derivations & 16 visual layouts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Class 12 Physics Test Benchmark Shortcut */}
          <button
            onClick={loadClass12PhysicsPreset}
            className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="Load Class 12 Physics Benchmark Sample"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Class 12 Physics Benchmark</span>
          </button>

          {isSavedView && (
            <button
              onClick={() => {
                setIsSavedView(false);
                setActiveTab('library');
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Library</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN LAYOUT split between Config Form & Map Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT DEEP RESEARCH CONFIGURATION PANEL */}
        {!isSavedView && (
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            {/* Active YouTube Context Banner */}
            {activeYouTubeSession && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-indigo-500/10 border border-red-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center shrink-0">
                    <Youtube className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                    YouTube Context Active
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {activeYouTubeSession.title}
                </div>
                <button
                  onClick={() => {
                    setChapterName(activeYouTubeSession.title);
                    setSubject('YouTube Lecture');
                  }}
                  className="w-full py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Sync Video Lecture Title
                </button>
              </div>
            )}

            {/* Chapter / Topic Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                Chapter / Topic Name *
              </label>
              <input
                type="text"
                value={chapterName}
                onChange={(e) => {
                  const val = e.target.value;
                  setChapterName(val);
                  const lower = val.toLowerCase();
                  if (lower.match(/photosynthesis|cell|dna|plant|heart|respiration|human body/)) setSubject('Biology');
                  else if (lower.match(/electric|charge|newton|gravity|motion|light|magnet|field/)) setSubject('Physics');
                  else if (lower.match(/acid|base|chemical|reaction|periodic table|atom/)) setSubject('Chemistry');
                  else if (lower.match(/trigonometry|algebra|calculus|geometry|equation/)) setSubject('Mathematics');
                  else if (lower.match(/mughal|gandhi|freedom|war|revolution|history/)) setSubject('History');
                  else if (lower.match(/climate|soil|river|map|geography/)) setSubject('Geography');
                }}
                placeholder="e.g. Electric Charges and Fields, Newton Laws, Trigonometry..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium block mt-1">
                ✨ Deep Research Engine extracts all subtopics, formulas, derivations & NCERT tips
              </span>
            </div>

            {/* Class & Subject */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Class / Grade</label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                  <option value="JEE / NEET">JEE / NEET Exam</option>
                  <option value="College / General">College / General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="History">History & Civics</option>
                  <option value="Geography">Geography</option>
                  <option value="Economics">Economics</option>
                  <option value="English">English Literature</option>
                  <option value="General Knowledge">General Knowledge</option>
                </select>
              </div>
            </div>

            {/* Board / Exam & Learning Depth */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Board / Exam</label>
                <select
                  value={boardOrExam}
                  onChange={(e) => setBoardOrExam(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="CBSE Board / NCERT">CBSE Board / NCERT</option>
                  <option value="ICSE / ISC Board">ICSE / ISC Board</option>
                  <option value="State Board">State Board</option>
                  <option value="JEE Main & Advanced">JEE Main & Advanced</option>
                  <option value="NEET UG Medical">NEET UG Medical</option>
                  <option value="College / Competitive">College / Competitive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Learning Depth</label>
                <select
                  value={learningLevel}
                  onChange={(e) => setLearningLevel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Basic">Basic (Overview)</option>
                  <option value="Intermediate">Intermediate (School)</option>
                  <option value="Advanced">Advanced (Board Level)</option>
                  <option value="Competitive (JEE/NEET)">Competitive (JEE/NEET)</option>
                  <option value="Expert">Expert (Complete Mastery)</option>
                </select>
              </div>
            </div>

            <LanguageSelector language={language} onChange={setLanguage} />

            {/* 16 Mind Map Templates Selection Grid */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-cyan-500" />
                  <span>Select Mind Map Template (16 Types)</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                  {MINDMAP_TEMPLATES.length} Templates
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[10px] font-bold">
                {(['All', 'Structural', 'Mathematical', 'Analytical', 'Exam & Roadmap'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveTabCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                      activeTabCategory === cat
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Template Cards Scroll Box */}
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar p-1">
                {filteredTemplates.map((t) => {
                  const isSel = selectedTemplateId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                        isSel
                          ? 'bg-cyan-50/80 dark:bg-cyan-950/80 border-cyan-500 ring-2 ring-cyan-500/30'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${t.color}`} />
                          {t.title}
                        </span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        {t.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Instructions */}
            <CustomPromptInput
              value={customPrompt}
              onChange={setCustomPrompt}
              placeholder="e.g. Include numerical problem solving steps, focus on Gauss law applications..."
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Optional Chapter Notes (Paste text below)
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste chapter notes or NCERT textbook text for AI Deep Research..."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <FileUploadBox
              attachment={attachment}
              onFileSelect={(file) => setAttachment(file)}
              label="Upload Chapter PDF, Diagram Photo or Video"
              hint="AI Deep Research Engine will OCR & read formulas to generate mind map"
            />

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={handleGenerate}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-extrabold shrink-0 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-extrabold text-sm shadow-md hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    <span>Deep Researching Chapter...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate AI Deep Mind Map ✨</span>
                  </>
                )}
              </button>

              {loading && (
                <button
                  onClick={handleCancelMindMap}
                  className="px-4 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition-all shrink-0 cursor-pointer"
                  title="Cancel Generation"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* RIGHT CANVAS & VISUAL MAP */}
        <div className={`${isSavedView ? 'lg:col-span-12' : 'lg:col-span-7'} bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[600px]`}>
          
          {/* Canvas Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Layers className="w-4 h-4 text-cyan-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {mindmapData ? mindmapData.rootTitle : 'AarohAI Concept Canvas'}
              </h3>
              {processingTime && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                  ⚡ {processingTime}s Deep Research
                </span>
              )}
            </div>

            {mindmapData && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Bar for Map Nodes */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter nodes..."
                    className="pl-8 pr-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 w-32 focus:w-44 transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {/* Master Audio Button */}
                <TTSButton
                  id={`mindmap-master-${mindmapData.rootTitle}`}
                  text={getFullAudioScript()}
                  label="Listen Full Map"
                  variant="pill"
                  size="sm"
                />

                {/* Zoom Controls */}
                <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                  <button
                    onClick={() => handleZoom('out')}
                    title="Zoom Out"
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-bold w-9 text-center text-slate-700 dark:text-slate-300">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => handleZoom('in')}
                    title="Zoom In"
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleZoom('reset')}
                    title="Reset Zoom"
                    className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Print PDF Button */}
                <button
                  onClick={handlePrintPDF}
                  title="Print / Export PDF"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                {/* Save Button */}
                <button
                  onClick={handleSaveToWorkspace}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  <span>{savedSuccess ? 'Saved in Library!' : 'Save Map'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Interactive Dynamic Template Switcher when mindmap is loaded */}
          {mindmapData && (
            <div className="pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">Switch Layout View:</span>
              {MINDMAP_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                    selectedTemplateId === t.id
                      ? 'bg-cyan-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {t.title.split('.')[1] || t.title}
                </button>
              ))}
            </div>
          )}

          {/* Canvas Viewport */}
          <div className="flex-1 relative overflow-auto custom-scrollbar p-2 mt-2">
            {!mindmapData && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-50">
                <Brain className="w-16 h-16 animate-pulse text-cyan-500" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 max-w-md">
                  Select any of the 16 templates, enter a chapter and tap "Generate AI Deep Mind Map"
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Or tap "Class 12 Physics Benchmark" to test with Electric Charges and Fields right now!
                </p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-5 my-auto">
                
                {/* Timer Header Pill */}
                <div className="flex items-center gap-3">
                  <div className="px-4 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold text-xs shadow-lg flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>⏱️ Live Timer: {elapsedSeconds}s / 240s Max Budget</span>
                  </div>
                  <span className="px-3 py-1.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-bold text-[11px]">
                    ⚡ Instant Delivery Active
                  </span>
                </div>

                {/* Animated Brain Icon */}
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center animate-spin shadow-2xl ring-4 ring-cyan-400/20">
                  <Brain className="w-10 h-10" />
                </div>

                {/* Active Stage Banner */}
                <div className="space-y-1 max-w-lg">
                  <h3 className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                    🔬 Stage {currentStageIndex + 1}/6: {RESEARCH_STAGES[currentStageIndex]?.label}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {generationStep}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-md space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>Deep Research Progress</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-black">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 transition-all duration-300 shadow-sm"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Stage Steps Grid */}
                <div className="w-full max-w-lg grid grid-cols-2 sm:grid-cols-3 gap-2 text-left pt-2">
                  {RESEARCH_STAGES.map((stg, idx) => {
                    const isDone = idx < currentStageIndex;
                    const isActive = idx === currentStageIndex;
                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border text-[10px] space-y-0.5 transition-all ${
                          isDone
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : isActive
                            ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-500/40 text-cyan-900 dark:text-cyan-200 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold truncate">Stage {idx + 1}</span>
                          {isDone ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : isActive ? (
                            <Sparkles className="w-3 h-3 text-cyan-500 animate-spin" />
                          ) : null}
                        </div>
                        <div className="truncate font-semibold">{stg.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Notice Footer */}
                <p className="text-[10px] text-slate-400 max-w-md italic">
                  Note: 170 seconds is the maximum budget. If research completes in 20s or 45s, result will show IMMEDIATELY!
                </p>

                <button
                  onClick={handleCancelMindMap}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Cancel Generation
                </button>
              </div>
            )}

            {mindmapData && !loading && (
              <div
                className="transition-transform duration-200 origin-top p-2 flex flex-col items-center w-full"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <TemplateRendererDispatcher
                  templateId={selectedTemplateId}
                  data={mindmapData}
                  searchFilter={searchFilter}
                  onSelectNode={(node) => setSelectedNodeForDetail(node)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
            <span>💡 Pro Tip: Click any node to open the Deep Inspector with step-by-step derivations & formulas!</span>
            <span>AarohAI Deep Research Engine</span>
          </div>
        </div>

      </div>
    </div>
  );
};
