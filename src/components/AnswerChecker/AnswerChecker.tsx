import React, { useState, useRef, useEffect } from 'react';
import {
  CheckSquare,
  Sparkles,
  Upload,
  AlertTriangle,
  Award,
  CheckCircle2,
  Bookmark,
  Check,
  ArrowLeft,
  Volume2,
  Youtube
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { AnswerEvaluation } from '../../types';
import { CustomPromptInput } from '../common/CustomPromptInput';
import { FileUploadBox } from '../common/FileUploadBox';
import { TTSButton } from '../common/TTSButton';
import { aiService } from '../../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const AnswerChecker: React.FC = () => {
  const { saveEvaluation, activeYouTubeSession, setActiveYouTubeSession } = useLibrary();
  const { viewerData, setViewerData, language, setLanguage, setActiveTab } = useAuth();

  const [activeTabMode, setActiveTabMode] = useState<'text' | 'photo' | 'pdf'>('text');
  const [question, setQuestion] = useState('Define Ohm\'s Law and state its mathematical expression.');
  const [writtenAnswer, setWrittenAnswer] = useState('Ohm\'s Law states that current is proportional to voltage. V = IR.');
  const [maxMarks, setMaxMarks] = useState<number>(5);
  const [subject, setSubject] = useState('Physics');
  const [customPrompt, setCustomPrompt] = useState('');

  const [uploadedFile, setUploadedFile] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavedView, setIsSavedView] = useState(false);

  useEffect(() => {
    if (viewerData && viewerData.type === 'evaluation') {
      const ev = viewerData.data as AnswerEvaluation;
      setEvaluation(ev);
      setSubject(ev.subject || 'Physics');
      setMaxMarks(ev.maxMarks || 5);
      setIsSavedView(true);
      setViewerData(null);
    }
  }, [viewerData, setViewerData]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      setUploadedFile({
        base64,
        mimeType: file.type || 'image/jpeg',
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setEvaluation(null);
    setSavedSuccess(false);
    setErrorMessage(null);
    setProcessingTime(null);
    setIsSavedView(false);
    const start = Date.now();

    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const data = await aiService.checkAnswer({
        question,
        writtenAnswer,
        maxMarks,
        subject,
        customPrompt,
        youtubeContext: activeYouTubeSession || undefined
      }, {
        language: language as any,
        customPrompt,
        attachment: uploadedFile,
        signal: controller.signal
      });

      if (data.evaluation) {
        setEvaluation(data.evaluation);
        setProcessingTime(Math.round((Date.now() - start) / 1000));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMessage(err.message || 'Evaluation failed. Please retry.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveToWorkspace = () => {
    if (!evaluation) return;
    saveEvaluation({ ...evaluation, subject });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Compile full evaluation speech text
  const getEvaluationAudioScript = (): string => {
    if (!evaluation) return '';
    let script = `Evaluation Report. Marks awarded: ${evaluation.marksObtained} out of ${evaluation.maxMarks}. `;
    if (evaluation.correctPoints && evaluation.correctPoints.length > 0) {
      script += `Correct points: ${evaluation.correctPoints.join('. ')}. `;
    }
    if (evaluation.missingPoints && evaluation.missingPoints.length > 0) {
      script += `Missing points: ${evaluation.missingPoints.join('. ')}. `;
    }
    if (evaluation.modelAnswer) {
      script += `Ideal topper answer: ${evaluation.modelAnswer}. `;
    }
    if (evaluation.spellingGrammarTips) {
      script += `Examiner tip: ${evaluation.spellingGrammarTips}`;
    }
    return script;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-md">
            <CheckSquare className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Examiner Answer Checker</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold uppercase">
                Board Rubric Pro
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Board-style grading, missing points detection, model answer & audio assessment
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

      {/* Input Mode Selector (Hidden in saved report view) */}
      {!isSavedView && (
        <div className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl flex items-center gap-1">
          {(['text', 'photo', 'pdf'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setActiveTabMode(m);
                setUploadedFile(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTabMode === m
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {m} Answer checker
            </button>
          ))}
        </div>
      )}

      {/* SETUP & SUBMISSION FORM */}
      {!isSavedView && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          {/* Active YouTube Context Banner */}
          {activeYouTubeSession && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-indigo-500/10 border border-red-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center shrink-0">
                    <Youtube className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                    YouTube Grading Context
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {activeYouTubeSession.title}
                  </span>
                </div>
              </div>
              {activeYouTubeSession.videos[0]?.potentialQuestions?.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Select a question from this video lecture:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeYouTubeSession.videos[0].potentialQuestions.slice(0, 3).map((pq, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setQuestion(pq.question);
                          setSubject(activeYouTubeSession.title);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium hover:bg-slate-50 line-clamp-1 max-w-xs text-left"
                      >
                        Q: {pq.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Max Marks</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="Hinglish">Hinglish</option>
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Question Statement *</label>
            </div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Paste or type the exact exam question here..."
              rows={2}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {activeTabMode === 'text' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Your Written Answer *</label>
              </div>
              <textarea
                value={writtenAnswer}
                onChange={(e) => setWrittenAnswer(e.target.value)}
                placeholder="Type or speak your answer as you would write in the exam..."
                rows={5}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Upload Answer Sheet (Handwritten Photo, PDF or Document)
              </label>
              <FileUploadBox
                attachment={uploadedFile}
                onFileSelect={(file) => setUploadedFile(file)}
                label={`Upload Handwritten ${activeTabMode === 'photo' ? 'Photo / Image' : 'PDF / Document'}`}
                hint="AI Vision & OCR will transcribe handwriting, check step-by-step steps and award marks"
              />
            </div>
          )}

          {/* Reusable Custom Instructions Component */}
          <CustomPromptInput
            value={customPrompt}
            onChange={setCustomPrompt}
            placeholder="e.g. Strict CBSE marking, check diagram presence, highlight missing keywords..."
            label="Optional Examiner Guidance (मूल्यांकन निर्देश ✨)"
          />

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:opacity-95 text-white font-black text-sm shadow-md hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            {evaluating ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>Examiner Evaluating Marks & Accuracy...</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-5 h-5" />
                <span>Evaluate Answer Accuracy ✨</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* EVALUATION REPORT CARD */}
      {evaluation && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
          
          {/* Top Score Banner with Master Audio Button */}
          <div className="flex flex-wrap items-center justify-between p-6 bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 rounded-3xl text-white gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                <Award className="w-10 h-10 text-amber-300" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-3xl font-black">
                  {evaluation.marksObtained} <span className="text-lg opacity-80">/ {evaluation.maxMarks}</span>
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs uppercase font-extrabold tracking-widest text-emerald-100">
                    Awarded Score • {subject}
                  </p>
                  {processingTime && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                      ⚡ Evaluated in {processingTime}s
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Master Audio Button */}
              <TTSButton
                id="eval-master-audio"
                text={getEvaluationAudioScript()}
                label="Listen Evaluation Report"
                variant="pill"
                size="sm"
                className="bg-white text-emerald-900 border-white"
              />

              <button
                onClick={handleSaveToWorkspace}
                className="px-4 py-2 bg-white/90 hover:bg-white text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span>{savedSuccess ? 'Saved in Library!' : 'Save Report'}</span>
              </button>
            </div>
          </div>

          {/* REQUIREMENT 4: HANDWRITING ANALYSIS & WRITING PRESENTATION CARD */}
          <div className="p-6 rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✍️</span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide text-indigo-900 dark:text-indigo-200">
                    Handwriting & Board Exam Presentation Assessment
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Evaluation of handwriting legibility, presentation neatness, structural flow, and board exam marking impact
                  </p>
                </div>
              </div>

              <TTSButton
                id="eval-style-audio"
                text={`Handwriting and Presentation Feedback. ${evaluation.handwritingReadability || 'Handwriting is legible and readable.'} Detected format: ${evaluation.studentStyleDetected || 'Standard Written Format'}. Recommended format: ${evaluation.recommendedFormat || 'Point-by-point Bullet Points'}. ${evaluation.writingStyleFeedback || evaluation.spellingGrammarTips || 'Breaking answers into bullet points with bold sub-headers earns full presentation marks in Board exams.'}`}
                size="sm"
                variant="subtle"
                label="Listen Style & Handwriting Tip"
              />
            </div>

            {/* Handwriting Readability Status & Recommendations */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase block mb-0.5">Handwriting Legibility:</span>
                <span className="font-extrabold text-purple-700 dark:text-purple-300 text-xs flex items-center gap-1.5">
                  <span>📝</span> {evaluation.handwritingReadability || 'Legible & Easily Readable by Examiner'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase block mb-0.5">Your Detected Writing Format:</span>
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-1.5">
                  <span>📌</span> {evaluation.studentStyleDetected || 'Paragraph Format Used'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase block mb-0.5">Recommended Board Format:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                  <span>🎯</span> {evaluation.recommendedFormat || 'Bullet Points + Underlined Keywords'}
                </span>
              </div>
            </div>

            {/* Exam Writing Presentation Tips */}
            <div className="space-y-2 bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900">
              <h5 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <span>🏆</span>
                <span>Specific Board Exam Presentation & Score Boosting Guidance:</span>
              </h5>
              <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                {evaluation.writingStyleFeedback || evaluation.spellingGrammarTips || '1. Keep clear 1-line gap between points. 2. Underline important technical formulas and keywords with a pencil. 3. Draw clean labeled diagrams on the right margin.'}
              </p>
            </div>
          </div>

          {/* Correct Points vs Missing Points Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Correct Points Card */}
            <div className="p-6 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-3xl border border-emerald-200/80 dark:border-emerald-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Correct Key Points ({evaluation.correctPoints?.length || 0})</span>
                </h4>
                <TTSButton
                  id="eval-correct-audio"
                  text={`Correct points awarded: ${evaluation.correctPoints?.join('. ') || 'None'}`}
                  size="sm"
                  variant="subtle"
                  label="Listen"
                />
              </div>
              <ul className="space-y-2 text-xs font-medium text-emerald-950 dark:text-emerald-200">
                {evaluation.correctPoints?.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Missing Points Card */}
            <div className="p-6 bg-amber-50/70 dark:bg-amber-950/30 rounded-3xl border border-amber-200/80 dark:border-amber-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Missing Points for Full Marks ({evaluation.missingPoints?.length || 0})</span>
                </h4>
                <TTSButton
                  id="eval-missing-audio"
                  text={`Missing points for full marks: ${evaluation.missingPoints?.join('. ') || 'None'}`}
                  size="sm"
                  variant="subtle"
                  label="Listen"
                />
              </div>
              <ul className="space-y-2 text-xs font-medium text-amber-950 dark:text-amber-200">
                {evaluation.missingPoints?.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-amber-600 font-bold">!</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Ideal Topper Answer Section */}
          <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Ideal Model Topper Answer (Full Marks Standard)</span>
              </h4>
              <TTSButton
                id="eval-model-audio"
                text={`Model answer: ${evaluation.modelAnswer}`}
                size="sm"
                variant="subtle"
                label="Listen Answer"
              />
            </div>

            <div className="prose dark:prose-invert max-w-none prose-sm leading-relaxed p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {evaluation.modelAnswer}
              </ReactMarkdown>
            </div>
          </div>

          {/* Examiner Grammar & Presentation Tips */}
          {evaluation.spellingGrammarTips && (
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl text-xs font-medium text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 leading-relaxed flex items-start gap-2">
              <span className="text-base">✍️</span>
              <p>
                <strong>Examiner Presentation Tip:</strong> {evaluation.spellingGrammarTips}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
