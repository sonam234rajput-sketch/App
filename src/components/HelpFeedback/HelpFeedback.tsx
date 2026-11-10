import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  MessageCircle,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FeedbackItem } from '../../types';

export const HelpFeedback: React.FC = () => {
  const { user } = useAuth();

  const [category, setCategory] = useState('General Question');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [requests, setRequests] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (data.feedback) {
        setRequests(data.feedback);
      }
    } catch (e) {
      console.log('Error fetching feedback history');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user?.name || 'Student User',
          userEmail: user?.email || 'student@aarohai.in',
          category,
          subject,
          message
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmitSuccess(true);
      setSubject('');
      setMessage('');
      fetchRequests();
    } catch (err: any) {
      alert(`Submission Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-600 text-white flex items-center justify-center shadow-md">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Help & Feedback</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold">
                Direct Support
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit a problem, suggest a feature, or track support status. Support email: <strong className="text-indigo-600 dark:text-indigo-400">rishavh332@gmail.com</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-500" />
            <span>Submit Request / Feedback</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="General Question">General Question / Problem</option>
                <option value="Bug Report">Report a Bug 🐛</option>
                <option value="Feature Suggestion">Suggest a Feature 💡</option>
                <option value="General Feedback">General Feedback ⭐</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your query..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Your Message / Problem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Describe what happened or what feature you would like to see..."
                className="w-full h-28 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Submitting request...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Request</span>
                </>
              )}
            </button>

            {submitSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Thank you! Your request has been logged. Status set to Pending 🟡</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Status Tracker */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span>Request Status Tracker</span>
          </h3>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {requests.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">No submitted requests found</p>
            ) : (
              requests.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{item.subject}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : item.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {item.status === 'Resolved' ? '🟢 Resolved' : item.status === 'In Progress' ? '🔵 In Progress' : '🟡 Pending'}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300">{item.message}</p>

                  {item.response && (
                    <div className="mt-2 p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200">
                      <strong>Owner Response:</strong> {item.response}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
