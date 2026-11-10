import React from 'react';
import {
  BarChart2,
  TrendingUp,
  Clock,
  BookOpen,
  Award,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Brain
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export const AnalyticsDashboard: React.FC = () => {
  const { quizzes, timerSessions, notes } = useLibrary();

  const totalQuizzes = quizzes.length;
  const totalQuestions = quizzes.reduce((acc, q) => acc + q.totalQuestions, 0);
  const totalCorrect = quizzes.reduce((acc, q) => acc + q.correct, 0);
  const totalWrong = quizzes.reduce((acc, q) => acc + q.wrong, 0);
  const totalSkipped = quizzes.reduce((acc, q) => acc + q.skipped, 0);
  const totalStudyMins = timerSessions.reduce((acc, t) => acc + t.durationMinutes, 0);

  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Subject performance calculation
  const subjectMap: Record<string, { total: number; correct: number }> = {};
  quizzes.forEach(q => {
    const subj = q.subject || 'General';
    if (!subjectMap[subj]) subjectMap[subj] = { total: 0, correct: 0 };
    subjectMap[subj].total += q.totalQuestions;
    subjectMap[subj].correct += q.correct;
  });

  const subjectStats = Object.keys(subjectMap).map(subj => {
    const data = subjectMap[subj];
    const acc = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    return { subject: subj, accuracy: acc, total: data.total };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <BarChart2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Performance & Analytics</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold">
                Private Workspace Metrics
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tracks quiz scores, study time, subject strength, and AI recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Quizzes Taken</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalQuizzes}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{totalQuestions} Total Questions</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Average Accuracy</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{overallAccuracy}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{totalCorrect} Correct Answers</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Focus Study Time</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {Math.floor(totalStudyMins / 60)}h {totalStudyMins % 60}m
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{timerSessions.length} Timer Sessions</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <Award className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Notes & Mind Maps</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{notes.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Saved in Workspace</p>
        </div>

      </div>

      {/* Subject-Wise Performance Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-500" />
          <span>Subject-Wise Performance & Accuracy</span>
        </h3>

        {subjectStats.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No quiz data yet. Take quizzes to see your subject-wise accuracy bars!
          </div>
        ) : (
          <div className="space-y-3">
            {subjectStats.map(st => (
              <div key={st.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">{st.subject}</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{st.accuracy}% ({st.total} Qs)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${st.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Smart Recommendations */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/20 via-purple-900/20 to-slate-900/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
        <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>AI Smart Study Recommendations</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-200">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 space-y-1">
            <h4 className="font-bold text-indigo-600 dark:text-indigo-400">🎯 Priority Revision Chapter</h4>
            <p className="text-slate-600 dark:text-slate-400">
              Based on your physics quiz scores, revise <strong>Class 10 Physics: Optics & Sign Conventions</strong> before taking your next test.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 space-y-1">
            <h4 className="font-bold text-emerald-600 dark:text-emerald-400">⚡ Study Habit Analysis</h4>
            <p className="text-slate-600 dark:text-slate-400">
              You are most consistent during 1-hour focus timer sessions. Keep doing 2 sessions daily for maximum retention.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
