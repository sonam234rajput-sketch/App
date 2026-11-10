import React, { useState } from 'react';
import {
  MindMapData,
  DeepMindMapNode,
  MindMapTemplateId,
  MindMapBranchNode
} from '../../types';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Award,
  AlertTriangle,
  Lightbulb,
  FileCode,
  Zap,
  ArrowRight,
  Sparkles,
  Layers,
  HelpCircle,
  Check,
  Target,
  Compass,
  Clock,
  Workflow
} from 'lucide-react';
import { TTSButton } from '../common/TTSButton';

interface RendererProps {
  data: MindMapData;
  searchFilter: string;
  onSelectNode: (node: DeepMindMapNode) => void;
}

const getNodeBgColor = (idx: number, customColor?: string) => {
  if (customColor && customColor.startsWith('#')) {
    return {
      borderColor: customColor,
      headerBg: `${customColor}15`,
      badgeBg: customColor,
      textColor: customColor
    };
  }
  const colorSchemes = [
    { borderColor: '#0284c7', headerBg: '#0284c715', badgeBg: '#0284c7', textColor: '#0284c7' },
    { borderColor: '#10b981', headerBg: '#10b98115', badgeBg: '#10b981', textColor: '#10b981' },
    { borderColor: '#8b5cf6', headerBg: '#8b5cf615', badgeBg: '#8b5cf6', textColor: '#8b5cf6' },
    { borderColor: '#f59e0b', headerBg: '#f59e0b15', badgeBg: '#f59e0b', textColor: '#f59e0b' },
    { borderColor: '#ec4899', headerBg: '#ec489915', badgeBg: '#ec4899', textColor: '#ec4899' },
    { borderColor: '#14b8a6', headerBg: '#14b8a615', badgeBg: '#14b8a6', textColor: '#14b8a6' },
    { borderColor: '#e11d48', headerBg: '#e11d4815', badgeBg: '#e11d48', textColor: '#e11d48' },
    { borderColor: '#6366f1', headerBg: '#6366f115', badgeBg: '#6366f1', textColor: '#6366f1' }
  ];
  return colorSchemes[idx % colorSchemes.length];
};

// ============================================================================
// 1. Hierarchical Mind Map Renderer
// ============================================================================
export const HierarchicalRenderer: React.FC<RendererProps> = ({ data, searchFilter, onSelectNode }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: prev[id] === false }));
  };

  const matchesSearch = (text: string) => {
    if (!searchFilter) return true;
    return text.toLowerCase().includes(searchFilter.toLowerCase());
  };

  return (
    <div className="w-full space-y-6">
      {/* Root Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block px-8 py-3.5 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-xl shadow-xl ring-4 ring-blue-400/20">
          {data.rootTitle}
        </div>
        {data.summary && (
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-blue-50/60 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200 dark:border-blue-800/60 max-w-xl mx-auto leading-relaxed">
            💡 {data.summary}
          </p>
        )}
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
        {data.branches.map((branch, idx) => {
          if (searchFilter && !matchesSearch(branch.title) && !branch.subNodes.some(s => matchesSearch(s.label) || matchesSearch(s.detail || ''))) {
            return null;
          }
          const isExp = expanded[branch.id] !== false;
          const scheme = getNodeBgColor(idx, branch.color);

          return (
            <div
              key={branch.id || idx}
              style={{ borderTopColor: scheme.borderColor, borderTopWidth: '4px' }}
              className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      style={{ backgroundColor: scheme.badgeBg }}
                      className="w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0"
                    >
                      {idx + 1}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {branch.title}
                    </h4>
                  </div>
                  <button
                    onClick={() => toggle(branch.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                {branch.summary && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic my-2 pl-1">
                    {branch.summary}
                  </p>
                )}

                {isExp && (
                  <div className="space-y-2.5 pt-2">
                    {branch.subNodes.map((sub, sIdx) => (
                      <div
                        key={sIdx}
                        onClick={() => onSelectNode({
                          id: `${branch.id}-${sIdx}`,
                          label: sub.label,
                          detail: sub.detail,
                          formula: sub.formula,
                          keyPoints: sub.keyPoints,
                          color: scheme.borderColor
                        })}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scheme.borderColor }} />
                            {sub.label}
                          </span>
                        </div>
                        {sub.detail && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 pl-3 leading-relaxed">
                            {sub.detail}
                          </p>
                        )}
                        {sub.formula && (
                          <div className="mt-1.5 pl-3">
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                              📐 {sub.formula}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 2. Radial Mind Map Renderer
// ============================================================================
export const RadialRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      {/* Central Hub Core */}
      <div className="relative z-10 w-44 h-44 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex flex-col items-center justify-center text-center p-4 shadow-2xl ring-8 ring-purple-400/20 mb-8 animate-pulse-slow">
        <Sparkles className="w-6 h-6 mb-1 text-yellow-300" />
        <h3 className="font-black text-sm leading-tight text-white">{data.rootTitle}</h3>
        <span className="text-[10px] font-extrabold uppercase mt-1 px-2 py-0.5 rounded-full bg-white/20">
          Radial Core Hub
        </span>
      </div>

      {/* Orbiting Satellite Branches */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.branches.map((branch, bIdx) => {
          const scheme = getNodeBgColor(bIdx, branch.color);
          return (
            <div
              key={branch.id || bIdx}
              className="bg-white dark:bg-slate-900 rounded-3xl p-4 border-2 shadow-lg flex flex-col justify-between"
              style={{ borderColor: scheme.borderColor }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div
                    className="w-7 h-7 rounded-full text-white font-bold text-xs flex items-center justify-center"
                    style={{ backgroundColor: scheme.badgeBg }}
                  >
                    {bIdx + 1}
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex-1 truncate">
                    {branch.title}
                  </h4>
                </div>
                <div className="space-y-2 pt-1">
                  {branch.subNodes.map((s, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => onSelectNode({
                        id: `${branch.id}-${sIdx}`,
                        label: s.label,
                        detail: s.detail,
                        formula: s.formula,
                        color: scheme.borderColor
                      })}
                      className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-700 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between"
                    >
                      <span className="truncate flex-1">{s.label}</span>
                      {s.formula && <span className="text-[9px] font-mono bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded ml-1">fx</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 3. Detailed Concept Map Renderer (Connected Card Matrix)
// ============================================================================
export const DetailedConceptRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6">
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
        <Layers className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <h3 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200">
            {data.rootTitle} - Linked Concept Graph
          </h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Interactive node network mapping concepts, principles, and mathematical relations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.branches.map((b, idx) => {
          const scheme = getNodeBgColor(idx, b.color);
          return (
            <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: scheme.borderColor }} />
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  {b.title}
                </h4>
              </div>
              <div className="space-y-2">
                {b.subNodes.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula, color: scheme.borderColor })}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all cursor-pointer space-y-1"
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{s.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    {s.detail && <p className="text-[11px] text-slate-600 dark:text-slate-400">{s.detail}</p>}
                    {s.formula && (
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 p-1.5 rounded border border-emerald-200 dark:border-emerald-800">
                        {s.formula}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 4. Flowchart Mind Map Renderer
// ============================================================================
export const FlowchartRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* Start Box */}
      <div className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-sm shadow-md">
        START: {data.rootTitle}
      </div>

      <ChevronDown className="w-5 h-5 text-slate-400 animate-bounce" />

      {/* Main Sequential Process Blocks */}
      <div className="w-full max-w-3xl space-y-4">
        {data.branches.map((b, idx) => (
          <React.Fragment key={b.id || idx}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-amber-500/40 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Workflow className="w-4 h-4" />
                  Step {idx + 1}: {b.title}
                </span>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded">
                  Process Node
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {b.subNodes.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 cursor-pointer text-xs"
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200">{s.label}</div>
                    {s.detail && <div className="text-[11px] text-slate-500 mt-1">{s.detail}</div>}
                  </div>
                ))}
              </div>
            </div>
            {idx < data.branches.length - 1 && (
              <div className="flex justify-center">
                <ChevronDown className="w-5 h-5 text-amber-500" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <ChevronDown className="w-5 h-5 text-slate-400" />
      <div className="px-6 py-2.5 rounded-full bg-slate-800 text-white font-extrabold text-xs">
        END: Mastery of {data.rootTitle}
      </div>
    </div>
  );
};

// ============================================================================
// 5. Step-by-Step Process Map Renderer
// ============================================================================
export const ProcessStepRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-4 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-lg font-black text-slate-900 dark:text-white">
          Step-by-Step Execution Sequence: {data.rootTitle}
        </h3>
        <p className="text-xs text-slate-500">Ordered linear progression with action outputs and parameters</p>
      </div>

      <div className="space-y-4">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="flex items-start gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md">
              {idx + 1}
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{b.title}</h4>
              {b.summary && <p className="text-xs text-slate-500">{b.summary}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                {b.subNodes.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-pink-500 cursor-pointer text-xs"
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200">{s.label}</div>
                    {s.detail && <p className="text-[11px] text-slate-500 mt-1">{s.detail}</p>}
                    {s.formula && <span className="inline-block mt-1 text-[10px] font-mono text-pink-600 font-semibold bg-pink-50 dark:bg-pink-950 p-1 rounded">📐 {s.formula}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 6. Formula & Equation Mind Map Renderer
// ============================================================================
export const FormulaEquationRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
        <div>
          <h3 className="font-black text-base">{data.rootTitle} - Formula & Equation Bank</h3>
          <p className="text-xs opacity-90">Comprehensive mathematical relations, units, and constants</p>
        </div>
        <FileCode className="w-8 h-8 opacity-80" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-sky-200 dark:border-sky-800/60 shadow-sm space-y-3">
            <h4 className="font-extrabold text-xs text-sky-700 dark:text-sky-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              {b.title}
            </h4>
            <div className="space-y-2">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-sky-500 cursor-pointer space-y-1.5"
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{s.label}</span>
                  </div>
                  {s.formula ? (
                    <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 font-mono text-xs font-extrabold text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      📐 {s.formula}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">No formula equation required</div>
                  )}
                  {s.detail && <p className="text-[11px] text-slate-600 dark:text-slate-400">{s.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 7. Derivation Mind Map Renderer
// ============================================================================
export const DerivationRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto">
      <div className="p-4 rounded-2xl bg-indigo-900 text-white space-y-1">
        <h3 className="font-black text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Derivation Proof Tree: {data.rootTitle}</span>
        </h3>
        <p className="text-xs text-indigo-200">Step-by-step mathematical proofs from fundamental axioms to target formulas</p>
      </div>

      <div className="space-y-5">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-extrabold text-sm text-indigo-700 dark:text-indigo-300">{b.title}</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                Proof Section {idx + 1}
              </span>
            </div>
            <div className="space-y-2.5">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 cursor-pointer space-y-1.5"
                >
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-black">
                      {sIdx + 1}
                    </span>
                    <span>{s.label}</span>
                  </div>
                  {s.formula && (
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono text-xs font-bold pl-4">
                      {s.formula}
                    </div>
                  )}
                  {s.detail && <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-4">{s.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 8. Comparison Mind Map Renderer
// ============================================================================
export const ComparisonRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h3 className="font-black text-lg text-slate-900 dark:text-white">
          Comparative Matrix: {data.rootTitle}
        </h3>
        <p className="text-xs text-slate-500">Side-by-side analytical comparison of key concepts & properties</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-purple-500/30 shadow-sm space-y-3">
            <h4 className="font-black text-sm text-purple-700 dark:text-purple-300 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>{b.title}</span>
            </h4>
            <div className="space-y-2">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 cursor-pointer space-y-1"
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{s.label}</div>
                  {s.detail && <p className="text-[11px] text-slate-600 dark:text-slate-400">{s.detail}</p>}
                  {s.formula && <span className="inline-block text-[10px] font-mono text-purple-600 font-bold bg-purple-50 dark:bg-purple-950 p-1 rounded">📐 {s.formula}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 9. Cause & Effect Renderer
// ============================================================================
export const CauseEffectRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6">
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
        <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
        <div>
          <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
            Causal Chain: {data.rootTitle}
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Mapping triggers, underlying physical mechanisms, and net consequences.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-200 dark:border-amber-800 shadow-sm space-y-2">
            <h4 className="font-extrabold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              {b.title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 cursor-pointer text-xs"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">{s.label}</div>
                  {s.detail && <p className="text-[11px] text-slate-500 mt-1">{s.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 10. Timeline Mind Map Renderer
// ============================================================================
export const TimelineRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <Clock className="w-5 h-5 text-cyan-500" />
          <span>Chronological Timeline: {data.rootTitle}</span>
        </h3>
      </div>

      <div className="relative pl-6 border-l-2 border-cyan-500 space-y-6">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="relative space-y-2">
            <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-cyan-500 ring-4 ring-cyan-100 dark:ring-cyan-950" />
            <h4 className="font-extrabold text-sm text-cyan-700 dark:text-cyan-300">{b.title}</h4>
            <div className="space-y-2 pt-1">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 cursor-pointer text-xs space-y-1 shadow-sm"
                >
                  <div className="font-bold text-slate-900 dark:text-white">{s.label}</div>
                  {s.detail && <p className="text-[11px] text-slate-500">{s.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 11. Classification Mind Map Renderer
// ============================================================================
export const ClassificationRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h3 className="font-black text-lg text-slate-900 dark:text-white">
          Taxonomic Classification: {data.rootTitle}
        </h3>
        <p className="text-xs text-slate-500">Categorical grouping, sub-species & characteristics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-3">
            <h4 className="font-extrabold text-xs text-emerald-700 dark:text-emerald-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Category {idx + 1}: {b.title}
            </h4>
            <div className="space-y-2">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 cursor-pointer text-xs"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">{s.label}</div>
                  {s.detail && <p className="text-[11px] text-slate-500 mt-1">{s.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 12. Problem Solving Renderer
// ============================================================================
export const ProblemSolvingRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto">
      <div className="p-4 rounded-2xl bg-violet-900 text-white flex items-center gap-3">
        <Target className="w-6 h-6 text-yellow-400 shrink-0" />
        <div>
          <h3 className="font-black text-base">Numerical Problem Solving Strategy: {data.rootTitle}</h3>
          <p className="text-xs text-violet-200">Diagnostic step-by-step framework for JEE / NEET numericals</p>
        </div>
      </div>

      <div className="space-y-4">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-violet-200 dark:border-violet-800 shadow-sm space-y-3">
            <h4 className="font-extrabold text-xs text-violet-700 dark:text-violet-300 uppercase tracking-wider">
              {b.title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-500 cursor-pointer text-xs"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">{s.label}</div>
                  {s.detail && <p className="text-[11px] text-slate-500 mt-1">{s.detail}</p>}
                  {s.formula && <span className="inline-block mt-1 text-[10px] font-mono text-violet-600 font-bold bg-violet-50 p-1 rounded">📐 {s.formula}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 13. Exam Preparation Renderer
// ============================================================================
export const ExamPrepRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
        <div>
          <h3 className="font-black text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-300" />
            <span>High-Yield Board Exam Revision Map: {data.rootTitle}</span>
          </h3>
          <p className="text-xs opacity-90">5-star exam topics, NCERT points & expected question types</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-200 dark:border-rose-800 shadow-sm space-y-3">
            <h4 className="font-black text-xs text-rose-700 dark:text-rose-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              ★ {b.title}
            </h4>
            <div className="space-y-2">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-500 cursor-pointer space-y-1 text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{s.label}</span>
                    <span className="text-[10px] text-amber-500 font-bold">★★★★★</span>
                  </div>
                  {s.detail && <p className="text-[11px] text-slate-600 dark:text-slate-400">{s.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 14. Chapter Roadmap Renderer
// ============================================================================
export const ChapterRoadmapRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto">
      <div className="p-4 rounded-2xl bg-indigo-950 text-white flex items-center gap-3">
        <Compass className="w-6 h-6 text-cyan-400 shrink-0" />
        <div>
          <h3 className="font-black text-base">Complete Chapter Roadmap (0 to 100%): {data.rootTitle}</h3>
          <p className="text-xs text-indigo-200">Progressive milestone tracking for syllabus completion</p>
        </div>
      </div>

      <div className="space-y-4">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-black text-sm text-indigo-700 dark:text-indigo-300">
                Stage {idx + 1}: {b.title}
              </h4>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                Milestone {idx + 1}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 cursor-pointer text-xs"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">{s.label}</div>
                  {s.detail && <p className="text-[11px] text-slate-500 mt-1">{s.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 15. Dependency Map Renderer
// ============================================================================
export const DependencyMapRenderer: React.FC<RendererProps> = ({ data, onSelectNode }) => {
  return (
    <div className="w-full space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h3 className="font-black text-lg text-slate-900 dark:text-white">
          Prerequisite & Concept Dependency Map: {data.rootTitle}
        </h3>
        <p className="text-xs text-slate-500">Prerequisites required before studying this chapter</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.branches.map((b, idx) => (
          <div key={b.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-teal-200 dark:border-teal-800 shadow-sm space-y-3">
            <h4 className="font-extrabold text-xs text-teal-700 dark:text-teal-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              {b.title}
            </h4>
            <div className="space-y-2">
              {b.subNodes.map((s, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectNode({ id: `${b.id}-${sIdx}`, label: s.label, detail: s.detail, formula: s.formula })}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-500 cursor-pointer text-xs"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">{s.label}</div>
                  {s.detail && <p className="text-[11px] text-slate-500 mt-1">{s.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 16. Master Mind Map Renderer (Combines All Aspects)
// ============================================================================
export const MasterMapRenderer: React.FC<RendererProps> = ({ data, searchFilter, onSelectNode }) => {
  return (
    <div className="w-full space-y-6">
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-700 text-white shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-300" />
          <span className="text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20">
            Advanced Master Mind Map
          </span>
        </div>
        <h2 className="text-2xl font-black">{data.rootTitle}</h2>
        {data.summary && <p className="text-xs text-slate-100 max-w-3xl leading-relaxed">{data.summary}</p>}
      </div>

      <HierarchicalRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />
    </div>
  );
};

// Master Template Switcher Renderer Dispatcher
export const TemplateRendererDispatcher: React.FC<{
  templateId: MindMapTemplateId | string;
  data: MindMapData;
  searchFilter: string;
  onSelectNode: (node: DeepMindMapNode) => void;
}> = ({ templateId, data, searchFilter, onSelectNode }) => {
  switch (templateId) {
    case 'radial':
      return <RadialRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'detailed_concept':
      return <DetailedConceptRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'flowchart':
      return <FlowchartRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'process_step':
      return <ProcessStepRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'formula_equation':
      return <FormulaEquationRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'derivation':
      return <DerivationRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'comparison':
      return <ComparisonRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'cause_effect':
      return <CauseEffectRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'timeline':
      return <TimelineRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'classification':
      return <ClassificationRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'problem_solving':
      return <ProblemSolvingRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'exam_prep':
      return <ExamPrepRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'chapter_roadmap':
      return <ChapterRoadmapRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'dependency_map':
      return <DependencyMapRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'master_map':
      return <MasterMapRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
    case 'hierarchical':
    default:
      return <HierarchicalRenderer data={data} searchFilter={searchFilter} onSelectNode={onSelectNode} />;
  }
};
