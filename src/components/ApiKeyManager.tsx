import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { ApiKeyInfo } from '../types';
import { useAuth } from '../context/AuthContext';

export const ApiKeyManager: React.FC = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchKeys();
  }, [user]);

  const fetchKeys = async () => {
    const userId = user?.id;
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/keys?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.keys) {
        setKeys(data.keys);
      }
    } catch (e) {
      console.error('Failed to fetch keys:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyValue.trim()) return;

    const userId = user?.id;
    if (!userId) {
      setStatusMessage({ type: 'error', text: 'Please complete registration or sign in to configure your personal API key.' });
      return;
    }

    setAddingKey(true);
    setStatusMessage({ type: 'success', text: 'Verifying API Key with Google Gemini list-models endpoint... ⏳' });

    try {
      const res = await fetch('/api/user/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: newKeyName.trim() || `My API Key ${keys.length + 1}`,
          key: newKeyValue.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API Key Verification Failed');

      if (data.keys) {
        setKeys(data.keys);
      }
      setStatusMessage({
        type: 'success',
        text: `VALID API KEY 🟢 — ${data.message || 'Key verified with Google Gemini and securely stored for your personal AI requests!'}`
      });
      setNewKeyName('');
      setNewKeyValue('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `INVALID API KEY 🔴 — ${err.message || 'Key verification failed'}` });
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    // Optimistically remove from state immediately
    setKeys(prev => prev.filter(k => k.id !== id));
    setStatusMessage({ type: 'success', text: 'API Key removed from your secure personal key vault 🟢' });

    try {
      const userId = user?.id;
      const url = userId 
        ? `/api/user/keys/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`
        : `/api/keys/${encodeURIComponent(id)}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete key');
      if (data.keys) {
        setKeys(data.keys);
      } else {
        fetchKeys();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Key Removal Failed: ${err.message}` });
      fetchKeys(); // Revert on failure
    }
  };

  const handleActivateKey = async (index: number) => {
    try {
      const userId = user?.id;
      const url = userId ? '/api/user/keys/active' : '/api/keys/active';
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, index })
      });
      fetchKeys();
    } catch (err: any) {
      console.error('Failed to set active key:', err);
    }
  };

  const [verifyingKeyId, setVerifyingKeyId] = useState<string | null>(null);

  const handleVerifyKey = async (id?: string) => {
    setVerifyingKeyId(id || 'all');
    setStatusMessage(null);
    try {
      const userId = user?.id;
      const url = userId ? '/api/user/keys/verify' : '/api/keys/verify';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id })
      });
      const data = await res.json();
      if (data.keys) {
        setKeys(data.keys);
      }
      if (data.valid) {
        setStatusMessage({ type: 'success', text: `VALID API KEY 🟢 — ${data.message}` });
      } else {
        setStatusMessage({ type: 'error', text: `INVALID API KEY 🔴 — ${data.message || data.error}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Verification Error: ${err.message}` });
    } finally {
      setVerifyingKeyId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-400 text-white flex items-center justify-center shadow-md">
            <Key className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Gemini API Multi-Key Pool</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                Auto-Failover Active
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Server-side multi-key rotation engine. Automatically switches keys on 429 quota exhaustion or temporary server errors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVerifyKey()}
            disabled={Boolean(verifyingKeyId)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <ShieldCheck className={`w-4 h-4 ${verifyingKeyId === 'all' ? 'animate-spin' : ''}`} />
            <span>Verify Active Key</span>
          </button>

          <button
            onClick={fetchKeys}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Pool</span>
          </button>
        </div>
      </div>

      {/* Direct Link Banner to Google AI Studio */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 rounded-2xl p-5 text-slate-950 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-sm">
            🔑
          </div>
          <div>
            <h3 className="text-sm font-black">Need a Free Gemini API Key?</h3>
            <p className="text-xs text-slate-900 font-medium">
              Get your free API key instantly from Google AI Studio in 1 click and add it to your failover pool below.
            </p>
          </div>
        </div>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-xs shadow-lg flex items-center gap-2 transition-transform transform hover:scale-105"
        >
          <span>Get Free API Key from Google AI Studio</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Security & Quota Architecture Alert */}
      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-200">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">How Multi-Key Failover Works in AarohAI:</p>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            • Keys are stored strictly on the server and are <strong>never sent to the browser or exposed in frontend code</strong>.<br />
            • If Key 1 hits a 429 quota limit, the server automatically rotates requests to Key 2, Key 3, etc. with zero downtime.<br />
            • You can generate free API keys at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-0.5">Google AI Studio <ExternalLink className="w-3 h-3" /></a> and add them to this pool.
          </p>
        </div>
      </div>

      {/* ADD NEW API KEY FORM */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          <span>Add New Gemini API Key to Pool</span>
        </h3>

        <form onSubmit={handleAddKey} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Key Label / Provider Name
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Rishabh Primary Key 2"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Gemini API Key (Hidden & Masked on Server)
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Get Google AI Studio Key ↗</span>
                </a>
              </div>
              <input
                type="password"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                required
                placeholder="AIzaSy... or AQ.Ab8..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={addingKey || !newKeyValue.trim()}
            className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {addingKey ? (
              <span>Saving Key to Server Pool...</span>
            ) : (
              <>
                <Key className="w-4 h-4" />
                <span>Add Key to Failover Pool</span>
              </>
            )}
          </button>

          {statusMessage && (
            <div className={`p-4 rounded-xl text-xs font-bold flex items-start justify-between gap-3 shadow-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/70 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {statusMessage.type === 'success' ? 'STATUS: VALID 🟢' : 'STATUS: INVALID 🔴'}
                    </span>
                    <span className="font-extrabold text-xs">Google Gemini API Key Verification</span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">{statusMessage.text}</p>
                </div>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold shrink-0 underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </form>
      </div>

      {/* CONFIGURED KEYS LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            <span>Configured Failover Keys ({keys.length})</span>
          </span>
          <span className="text-xs text-slate-400 font-normal">Active key is used first; others act as instant backup</span>
        </h3>

        <div className="space-y-3">
          {keys.map((k, idx) => (
            <div
              key={k.id}
              className={`p-4 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
                k.isActive
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{k.name}</span>
                  {k.isActive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                      Active Primary
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {k.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {k.maskedKey}
                  </span>
                  <span>• Successes: <strong className="text-emerald-600">{k.successCount}</strong></span>
                  <span>• Errors: <strong className="text-red-500">{k.errorCount}</strong></span>
                  {k.lastUsed && <span>• Last: {k.lastUsed}</span>}
                </div>

                {k.lastError && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Last Note: {k.lastError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVerifyKey(k.id)}
                  disabled={verifyingKeyId === k.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${verifyingKeyId === k.id ? 'animate-spin' : ''}`} />
                  <span>Verify Status</span>
                </button>

                {!k.isActive && (
                  <button
                    onClick={() => handleActivateKey(idx)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-xs font-bold transition-colors"
                  >
                    Set as Primary
                  </button>
                )}

                <button
                  onClick={() => handleDeleteKey(k.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Remove Key from Pool"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Key</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
