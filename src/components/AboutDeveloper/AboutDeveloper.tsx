import React from 'react';
import {
  Sparkles,
  GraduationCap,
  MapPin,
  Heart,
  BookOpen,
  Brain,
  MessageSquare,
  FileText,
  Clock,
  CheckSquare,
  ShieldCheck,
  Globe
} from 'lucide-react';

export const AboutDeveloper: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Developer Hero Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white p-8 sm:p-10 border border-indigo-500/20 shadow-xl hero-glow text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-500 p-1 mx-auto shadow-xl ring-4 ring-white/10">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-amber-400">
            <GraduationCap className="w-12 h-12" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Rishabh Kumar</h1>
          <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mt-1 flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Bhagalpur, Bihar, India</span>
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Founder & Lead Developer of <strong>AarohAI</strong>. Built with a vision to make high-quality, AI-powered learning and exam preparation tools completely free and accessible to students across every town and village in India.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-amber-200">
          <Heart className="w-4 h-4 text-red-400 fill-red-400" />
          <span>Made with Love for Indian Students</span>
        </div>
      </div>

      {/* Educational Mission Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <span>Our Educational Mission</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Education is the single most powerful tool for student growth. Many students across Bihar, Uttar Pradesh, and all Indian states struggle with expensive coaching fees or lack of personal doubt-clearing mentors. <strong>AarohAI</strong> brings standard board-examiner grading rubrics, instant OCR problem solving, and adaptive test generators directly to your phone and computer.
        </p>
      </div>

      {/* Detailed Explanation of All 6 Features */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Complete Feature Guide — How Students Can Use AarohAI
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4" />
              <span>1. Quiz Generator</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Generate 5 to 500 multiple-choice questions for 10th, 12th, NEET, or JEE. Mode A generates fresh AI questions, while Mode B extracts exact questions from uploaded textbook photographs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4" />
              <span>2. Mind Map Generator</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Transforms complex textbook chapters into colorful, expandable branch nodes showing definitions, process steps, formulas, and key exam connections.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>3. AI Chat Teacher</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              24/7 personal tutor responding in Hinglish, Hindi, or English. Upload photos of math or physics problems for instant step-by-step explanations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-sm">
              <CheckSquare className="w-4 h-4" />
              <span>4. Answer Checker</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Separate Text, Photo, and PDF modes evaluate handwritten answer sheets out of 1, 2, 5, 10, or 20 marks with board-marking rubrics and topper model answers.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              <span>5. Notes Generator</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Creates structured revision notes with comparison tables, formulas, and quick summaries, saved directly inside your workspace account library.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>6. Focus Timer</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Pomodoro study timer with large circular progress ring, audio alarms (Bell, Zen, Beep), and timestamp resilience across page navigation.
            </p>
          </div>

        </div>
      </div>

      {/* Privacy Guarantee */}
      <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Privacy & Free Use Information</span>
        </h3>
        <p className="leading-relaxed">
          AarohAI is free to use for students. Your private conversations, quizzes, mind maps, and study notes remain strictly isolated within your individual workspace account.
        </p>
      </div>

    </div>
  );
};
