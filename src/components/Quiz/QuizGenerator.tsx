import React, { useState, useRef, useEffect } from 'react';
import {
  Trophy,
  Sparkles,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Upload,
  ArrowLeft,
  Eye,
  RotateCcw,
  Youtube
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { QuizQuestion, QuizResult } from '../../types';
import { LanguageSelector } from '../common/LanguageSelector';
import { CustomPromptInput } from '../common/CustomPromptInput';
import { FileUploadBox } from '../common/FileUploadBox';
import { TTSButton } from '../common/TTSButton';
import { aiService } from '../../services/aiService';

export const QuizGenerator: React.FC = () => {
  const { saveQuiz, activeYouTubeSession, setActiveYouTubeSession } = useLibrary();
  const { viewerData, setViewerData, language, setLanguage, setActiveTab } = useAuth();

  const [mode, setMode] = useState<'A' | 'B' | 'YOUTUBE'>(activeYouTubeSession ? 'YOUTUBE' : 'A');
  const [className, setClassName] = useState('10th');
  const [subject, setSubject] = useState(activeYouTubeSession ? 'YouTube Lecture' : 'Physics');
  const [topic, setTopic] = useState(activeYouTubeSession ? activeYouTubeSession.title : 'SI Units & Motion');
  const [questionCount, setQuestionCount] = useState(10);
  const [customPrompt, setCustomPrompt] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number | null>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isSavedView, setIsSavedView] = useState(false);

  useEffect(() => {
    if (viewerData && viewerData.type === 'quiz') {
      const qz = viewerData.data as QuizResult;
      setQuestions(qz.questions || []);
      setUserAnswers(qz.userAnswers || {});
      setQuizCompleted(true);
      setClassName(qz.className || '10th');
      setSubject(qz.subject || 'General');
      setTopic(qz.title || 'Saved Quiz Practice');
      setIsSavedView(true);
      setViewerData(null);
    }
  }, [viewerData, setViewerData]);

  const [sourceText, setSourceText] = useState('');
  const [attachments, setAttachments] = useState<Array<{ base64: string; mimeType: string; name: string }>>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [timerSeconds, setTimerSeconds] = useState(600);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (questions.length > 0 && !quizCompleted && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            handleFinishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [questions.length, quizCompleted, timerSeconds]);

  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers({});
    setQuizCompleted(false);
    setErrorMessage(null);
    setTimerSeconds(questionCount * 60);
    setProcessingTime(null);
    setIsSavedView(false);
    const start = Date.now();

    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const maxBatchSize = 15;
      const batches = Math.ceil(questionCount / maxBatchSize);
      let allQuestions: QuizQuestion[] = [];

      for (let i = 0; i < batches; i++) {
        const batchCount = Math.min(maxBatchSize, questionCount - allQuestions.length);
        if (batchCount <= 0) break;

        const data = await aiService.generateQuiz({
          mode,
          className,
          subject,
          topic,
          questionCount: batchCount,
          sourceText,
          customPrompt,
          youtubeContext: mode === 'YOUTUBE' ? activeYouTubeSession : undefined
        }, {
          language: language as any,
          customPrompt,
          attachment: attachments.length > 0 ? attachments[0] : null,
          signal: controller.signal
        });

        if (data.questions) {
          allQuestions = [...allQuestions, ...data.questions];
          setQuestions([...allQuestions]);
        }
      }
      setProcessingTime(Math.round((Date.now() - start) / 1000));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMessage(err.message || 'Quiz generation failed. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (qIdx: number, optionIdx: number) => {
    if (userAnswers[qIdx] !== undefined) return;
    setUserAnswers(prev => ({ ...prev, [qIdx]: optionIdx }));
  };

  const handleFinishQuiz = () => {
    setQuizCompleted(true);
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };

  const handleSaveToWorkspace = () => {
    if (questions.length === 0) return;
    const correctCount = Object.values(userAnswers).filter((ans, i) => ans === questions[i].correctIndex).length;
    const errorCount = Object.values(userAnswers).filter((ans, i) => ans !== questions[i].correctIndex && ans !== null).length;
    const skippedCount = questions.length - Object.keys(userAnswers).length;

    saveQuiz({
      id: `qz-${Date.now()}`,
      title: `${subject}: ${topic}`,
      subject,
      className,
      totalQuestions: questions.length,
      attempted: Object.keys(userAnswers).length,
      correct: correctCount,
      wrong: errorCount,
      skipped: skippedCount,
      marksObtained: correctCount,
      maxMarks: questions.length,
      percentage: Math.round((correctCount / questions.length) * 100),
      date: new Date().toLocaleDateString('en-IN'),
      questions,
      userAnswers
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const currentQ = questions[currentIndex];

  // Helper to build audio text for a question
  const getQuestionAudio = (q: QuizQuestion, idx: number): string => {
    let script = `Question ${idx + 1}: ${q.question}. `;
    q.options.forEach((opt, oIdx) => {
      script += `Option ${String.fromCharCode(65 + oIdx)}: ${opt}. `;
    });
    return script;
  };

  // Helper to build master score audio script
  const getFinalScoreAudio = (): string => {
    const correct = Object.values(userAnswers).filter((ans, i) => ans === questions[i]?.correctIndex).length;
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    return `Exam Performance Report for ${subject}, ${topic}. You scored ${correct} out of ${questions.length} questions. Your accuracy rate is ${pct} percent. Shabash, keep practicing!`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {questions.length > 0 && !isSavedView && (
            <button
              onClick={() => {
                setQuestions([]);
                setQuizCompleted(false);
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Back to Setup"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-500 text-white flex items-center justify-center shadow-md">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Exam Quiz & MCQ Generator</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold uppercase">
                Interactive Voice
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exam preparation with timer, instant explanation, custom prompts & speaker audio
            </p>
          </div>
        </div>

        {isSavedView ? (
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
        ) : questions.length === 0 && (
          <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMode('A')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'A' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              AI Topic Mode
            </button>
            <button
              onClick={() => setMode('B')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'B' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Source Extract Mode
            </button>
            {activeYouTubeSession && (
              <button
                onClick={() => {
                  setMode('YOUTUBE');
                  setTopic(activeYouTubeSession.title);
                  setSubject('YouTube Lecture');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mode === 'YOUTUBE' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>From YouTube Video</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* QUIZ SETUP FORM (Only when questions are not active) */}
      {questions.length === 0 ? (
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
                      YouTube Video Context
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {activeYouTubeSession.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Questions will be generated directly from what was taught in this YouTube lecture
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setMode('YOUTUBE');
                    setTopic(activeYouTubeSession.title);
                    setSubject('YouTube Lecture');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    mode === 'YOUTUBE'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {mode === 'YOUTUBE' ? '✓ Mode Active' : 'Use Video for Quiz'}
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Class / Exam</label>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">MCQ Count</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value={5}>5 MCQs (Quick Test)</option>
                <option value={10}>10 MCQs (Standard Practice)</option>
                <option value={20}>20 MCQs (Full Exam Mock)</option>
                <option value={30}>30 MCQs (Deep Revision)</option>
              </select>
            </div>

            <LanguageSelector language={language} onChange={setLanguage} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Specific Topic / Chapter Focus *
              </label>
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. SI Units, Chemical Bonding, Cell Structure, Indian Constitution..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>

          {/* Source Material Extract Mode */}
          {mode === 'B' && (
            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <FileText className="w-4 h-4" />
                <span>Source Material Input (Paste Questions or Notes)</span>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste paragraph, question bank, or textbook text to extract exact MCQs..."
                rows={3}
                className="w-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
              <FileUploadBox
                attachments={attachments}
                onFilesChange={(files) => setAttachments(files)}
                label="Upload Question Papers, PDFs or Photos (Up to 20 files)"
                hint="AI will read handwritten/printed questions & extract exact MCQs"
              />
            </div>
          )}

          {/* Reusable Custom Instructions Component */}
          <CustomPromptInput
            value={customPrompt}
            onChange={setCustomPrompt}
            placeholder="e.g. Include numerical problems, prioritize Bihar Board model questions..."
          />

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            onClick={handleGenerateQuiz}
            disabled={isGenerating}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 text-white font-black text-sm shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>Generating Exam Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Start Quiz ✨</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Quiz Question Card */}
          {!quizCompleted && currentQ && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
              
              {/* Question Header & Timer */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg">
                    Class {className}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded-lg">
                    {subject}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Speaker Button to listen to question */}
                  <TTSButton
                    id={`quiz-q-${currentIndex}`}
                    text={getQuestionAudio(currentQ, currentIndex)}
                    variant="subtle"
                    label="Listen Question"
                    size="sm"
                  />

                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
                    <Clock className="w-4 h-4" />
                    <span>{Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {currentIndex + 1}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-relaxed">
                    {currentQ.question}
                  </h2>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {currentQ.options.map((opt, idx) => {
                    const selected = userAnswers[currentIndex] === idx;
                    const hasAnswered = userAnswers[currentIndex] !== undefined;
                    const isCorrect = idx === currentQ.correctIndex;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(currentIndex, idx)}
                        disabled={hasAnswered}
                        className={`p-4 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
                          hasAnswered
                            ? isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                              : selected
                              ? 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-900 dark:text-red-200'
                              : 'opacity-50 border-slate-200 dark:border-slate-800'
                            : 'hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </span>

                        {hasAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                        {hasAnswered && selected && !isCorrect && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Conceptual Explanation with TTS */}
                {userAnswers[currentIndex] !== undefined && (
                  <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl text-xs leading-relaxed border border-indigo-100 dark:border-indigo-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-indigo-900 dark:text-indigo-300">
                        💡 Concept Explanation:
                      </span>
                      <TTSButton
                        id={`quiz-exp-${currentIndex}`}
                        text={`Explanation: ${currentQ.explanation}`}
                        size="sm"
                        variant="subtle"
                        label="Listen"
                      />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{currentQ.explanation}</p>
                  </div>
                )}
              </div>

              {/* Bottom Pagination & Finish Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-bold px-2 text-slate-600 dark:text-slate-400">
                    {currentIndex + 1} of {questions.length}
                  </span>
                  <button
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {currentIndex === questions.length - 1 ? (
                  <button
                    onClick={handleFinishQuiz}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs rounded-xl shadow-md"
                  >
                    Finish & View Score 🏆
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
                  >
                    Next Question →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* QUIZ COMPLETED / SAVED QUIZ REVIEW ANALYSIS */}
          {quizCompleted && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg animate-bounce">
                  🏆
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Exam Performance Report
                </h2>
                <p className="text-sm text-slate-500 font-semibold">{subject} • {topic}</p>

                {/* Master TTS Audio Button for Final Score & Percentage */}
                <div className="flex justify-center pt-1">
                  <TTSButton
                    id="quiz-master-result-tts"
                    text={getFinalScoreAudio()}
                    label="Listen Performance Report"
                    variant="pill"
                    size="sm"
                  />
                </div>
              </div>

              {/* Score Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {Object.values(userAnswers).filter((ans, i) => ans === questions[i]?.correctIndex).length} / {questions.length}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Final Score</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {questions.length > 0 ? Math.round((Object.values(userAnswers).filter((ans, i) => ans === questions[i]?.correctIndex).length / questions.length) * 100) : 0}%
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Accuracy Rate</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                  <p className="text-2xl font-black text-red-600 dark:text-red-400">
                    {Object.values(userAnswers).filter((ans, i) => ans !== questions[i]?.correctIndex && ans !== null && ans !== undefined).length}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Incorrect</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                  <p className="text-2xl font-black text-slate-600 dark:text-slate-400">
                    {questions.length - Object.keys(userAnswers).length}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Skipped</p>
                </div>
              </div>

              {/* Comprehensive Question-by-Question Review with Individual TTS */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Detailed Answers & Explanations ({questions.length} Items)
                  </h3>
                  <span className="text-xs text-slate-400">Tap audio to listen to each answer</span>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qIdx) => {
                    const userChoice = userAnswers[qIdx];
                    const isCorrect = userChoice === q.correctIndex;
                    const audioText = `Question ${qIdx + 1}: ${q.question}. Correct Answer: ${q.options[q.correctIndex]}. Explanation: ${q.explanation}`;

                    return (
                      <div
                        key={qIdx}
                        className={`p-5 rounded-2xl border ${
                          isCorrect
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                            : userChoice !== undefined
                            ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        } space-y-3`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 flex-1">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {qIdx + 1}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {q.question}
                            </h4>
                          </div>

                          <TTSButton
                            id={`quiz-review-${qIdx}`}
                            text={audioText}
                            size="sm"
                            variant="pill"
                            label="Listen"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <span className="text-slate-400 block text-[10px] font-semibold">Your Response:</span>
                            <span className={isCorrect ? 'text-emerald-600 font-bold' : (userChoice !== null && userChoice !== undefined) ? 'text-red-600 font-bold' : 'text-slate-400 italic'}>
                              {(userChoice !== null && userChoice !== undefined && q.options[userChoice]) ? `${String.fromCharCode(65 + userChoice)}. ${q.options[userChoice]}` : 'Not attempted'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                            <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] font-bold">Correct Answer:</span>
                            <span className="text-emerald-800 dark:text-emerald-200 font-bold">
                              {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                          💡 <strong>Concept Explanation:</strong> {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                <button
                  onClick={() => {
                    setQuestions([]);
                    setQuizCompleted(false);
                    setUserAnswers({});
                    setIsSavedView(false);
                  }}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                >
                  Start New Quiz
                </button>

                <button
                  onClick={handleSaveToWorkspace}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm"
                >
                  {savedSuccess ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span>{savedSuccess ? 'Saved in Library!' : 'Save Quiz Report'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
