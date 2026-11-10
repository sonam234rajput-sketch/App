import React from 'react';
import {
  X,
  BookOpen,
  FileCode,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Share2,
  ExternalLink,
  Layers,
  Award,
  ArrowRight
} from 'lucide-react';
import { DeepMindMapNode } from '../../types';
import { TTSButton } from '../common/TTSButton';

interface NodeDetailModalProps {
  node: DeepMindMapNode | null;
  onClose: () => void;
  onSelectRelatedNode?: (nodeId: string) => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  onClose,
  onSelectRelatedNode
}) => {
  if (!node) return null;

  const fullAudioScript = `
    Concept: ${node.label}.
    ${node.summary || node.detail || ''}
    ${node.formula ? `Formula: ${node.formula}.` : ''}
    ${node.keyPoints && node.keyPoints.length > 0 ? `Key Points: ${node.keyPoints.join(', ')}.` : ''}
    ${node.examples && node.examples.length > 0 ? `Examples: ${node.examples.join(', ')}.` : ''}
    ${node.examTips && node.examTips.length > 0 ? `Board Exam Tips: ${node.examTips.join(', ')}.` : ''}
  `;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Level {node.level || 1} • {node.type || 'Concept'}
              </span>
              {node.color && (
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: node.color }} />
              )}
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {node.label}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <TTSButton
              id={`modal-node-tts-${node.id}`}
              text={fullAudioScript}
              label="Listen Concept"
              variant="pill"
              size="sm"
            />
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 text-xs">
          
          {/* Summary / Explanation */}
          {(node.summary || node.detail) && (
            <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 space-y-2">
              <h3 className="font-extrabold text-cyan-900 dark:text-cyan-200 text-xs flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Concept Explanation & Definition</span>
              </h3>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                {node.summary || node.detail}
              </p>
            </div>
          )}

          {/* Formulas */}
          {(node.formula || (node.formulas && node.formulas.length > 0)) && (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Formulas & Scientific Equations</span>
              </h3>
              {node.formula && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 font-mono text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold tracking-wide">
                  {node.formula}
                </div>
              )}
              {node.formulas && node.formulas.map((f, fIdx) => (
                <div key={fIdx} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white text-xs">{f.name}</div>
                  <div className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">{f.equation}</div>
                  {f.variables && <div className="text-[10px] text-slate-500">Variables: {f.variables}</div>}
                  {f.unit && <div className="text-[10px] text-slate-500">SI Unit: {f.unit}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Derivation Steps */}
          {node.derivationSteps && node.derivationSteps.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
              <h3 className="font-extrabold text-indigo-900 dark:text-indigo-200 text-xs flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Step-by-Step Mathematical Derivation</span>
              </h3>
              <div className="space-y-2">
                {node.derivationSteps.map((step, sIdx) => (
                  <div key={sIdx} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center shrink-0">
                        {step.stepNumber || sIdx + 1}
                      </span>
                      <span>{step.title}</span>
                    </div>
                    {step.mathExpr && (
                      <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 p-2 rounded-lg font-semibold pl-3">
                        {step.mathExpr}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-3">
                      {step.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Points */}
          {node.keyPoints && node.keyPoints.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Core Concept Highlights</span>
              </h3>
              <ul className="space-y-1.5 pl-2">
                {node.keyPoints.map((kp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Real World Examples & Applications */}
          {(node.examples?.length || node.applications?.length) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {node.examples && node.examples.length > 0 && (
                <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2">
                  <h4 className="font-bold text-purple-900 dark:text-purple-200 text-xs flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Real World Examples</span>
                  </h4>
                  <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                    {node.examples.map((ex, exIdx) => (
                      <li key={exIdx} className="flex items-start gap-1.5">
                        <span>•</span>
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {node.applications && node.applications.length > 0 && (
                <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 space-y-2">
                  <h4 className="font-bold text-teal-900 dark:text-teal-200 text-xs flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Practical Applications</span>
                  </h4>
                  <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                    {node.applications.map((app, appIdx) => (
                      <li key={appIdx} className="flex items-start gap-1.5">
                        <span>•</span>
                        <span>{app}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {/* Board Exam Tips & Common Mistakes */}
          {(node.examTips?.length || node.commonMistakes?.length) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {node.examTips && node.examTips.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-2">
                  <h4 className="font-bold text-rose-900 dark:text-rose-200 text-xs flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>NCERT / Board Exam Tips</span>
                  </h4>
                  <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                    {node.examTips.map((tip, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-1.5">
                        <span className="text-rose-600 font-bold">★</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {node.commonMistakes && node.commonMistakes.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Common Student Pitfalls</span>
                  </h4>
                  <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                    {node.commonMistakes.map((cm, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">⚠️</span>
                        <span>{cm}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {/* Child Subtopics Count */}
          {node.children && node.children.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-between text-[11px]">
              <span>Contains <strong>{node.children.length}</strong> deeper subtopic nodes</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">Multi-Level Depth Active</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            AarohAI Academic Concept Inspector
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs hover:opacity-90 transition-all cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
