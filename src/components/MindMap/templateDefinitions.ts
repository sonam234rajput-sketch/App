import { MindMapTemplateId } from '../../types';

export interface TemplateMeta {
  id: MindMapTemplateId;
  title: string;
  badge: string;
  category: 'Structural' | 'Mathematical' | 'Analytical' | 'Exam & Roadmap';
  description: string;
  iconName: string;
  color: string;
  recommendedSubject: string;
}

export const MINDMAP_TEMPLATES: TemplateMeta[] = [
  {
    id: 'hierarchical',
    title: '1. Hierarchical Mind Map',
    badge: 'Standard Tree',
    category: 'Structural',
    description: 'Deep root-to-branch multi-level vertical & horizontal concept tree hierarchy.',
    iconName: 'Network',
    color: 'from-blue-500 to-cyan-600',
    recommendedSubject: 'Physics, Chemistry, Biology'
  },
  {
    id: 'radial',
    title: '2. Radial Mind Map',
    badge: 'Central Hub',
    category: 'Structural',
    description: 'Central concept core surrounded by radiating orbital topic nodes and satellite concepts.',
    iconName: 'Sun',
    color: 'from-purple-500 to-indigo-600',
    recommendedSubject: 'Biology, History, General Knowledge'
  },
  {
    id: 'detailed_concept',
    title: '3. Detailed Concept Map',
    badge: 'Connected Graph',
    category: 'Structural',
    description: 'Interlinked conceptual cards with explicit relationship arrows, definitions & laws.',
    iconName: 'GitMerge',
    color: 'from-teal-500 to-emerald-600',
    recommendedSubject: 'Chemistry, Computer Science, Biology'
  },
  {
    id: 'flowchart',
    title: '4. Flowchart Mind Map',
    badge: 'Decision Flow',
    category: 'Structural',
    description: 'Sequential flow diagram with start nodes, process blocks, decision conditionals & outcomes.',
    iconName: 'Workflow',
    color: 'from-amber-500 to-orange-600',
    recommendedSubject: 'Algorithms, Organic Reactions, Physics'
  },
  {
    id: 'process_step',
    title: '5. Step-by-Step Process Map',
    badge: 'Linear Sequence',
    category: 'Analytical',
    description: 'Numbered step-by-step execution path specifying inputs, actions, formulas & outputs.',
    iconName: 'ListOrdered',
    color: 'from-rose-500 to-pink-600',
    recommendedSubject: 'Experimentation, Numerical Methods'
  },
  {
    id: 'formula_equation',
    title: '6. Formula & Equation Mind Map',
    badge: 'Math & Physics',
    category: 'Mathematical',
    description: 'Comprehensive formula bank detailing LaTeX equations, SI units, variables & constants.',
    iconName: 'Binary',
    color: 'from-sky-500 to-blue-700',
    recommendedSubject: 'Class 11/12 Physics, Maths, Physical Chem'
  },
  {
    id: 'derivation',
    title: '7. Derivation Mind Map',
    badge: 'Proof Steps',
    category: 'Mathematical',
    description: 'Step-by-step mathematical proof breakdown from initial laws to final boxed equation.',
    iconName: 'FileText',
    color: 'from-indigo-600 to-violet-700',
    recommendedSubject: 'Physics & Mathematics Derivations'
  },
  {
    id: 'comparison',
    title: '8. Comparison Mind Map',
    badge: 'Matrix View',
    category: 'Analytical',
    description: 'Side-by-side comparative matrix contrasting entities, properties, laws & differences.',
    iconName: 'Columns',
    color: 'from-fuchsia-500 to-purple-600',
    recommendedSubject: 'Conductors vs Insulators, AC vs DC, Optics'
  },
  {
    id: 'cause_effect',
    title: '9. Cause and Effect Mind Map',
    badge: 'Fishbone / Link',
    category: 'Analytical',
    description: 'Causal relationship map linking primary triggers, physical mechanisms & net effects.',
    iconName: 'Zap',
    color: 'from-amber-600 to-red-600',
    recommendedSubject: 'Physics Phenomenon, Economics, History'
  },
  {
    id: 'timeline',
    title: '10. Timeline Mind Map',
    badge: 'Chronological',
    category: 'Analytical',
    description: 'Chronological track detailing historical milestones, scientific discoveries & evolution.',
    iconName: 'Clock',
    color: 'from-cyan-600 to-teal-700',
    recommendedSubject: 'History, Science Evolution, Literature'
  },
  {
    id: 'classification',
    title: '11. Classification Mind Map',
    badge: 'Taxonomy',
    category: 'Structural',
    description: 'Taxonomic categorization map splitting domain into classes, sub-groups & features.',
    iconName: 'Layers',
    color: 'from-emerald-600 to-green-700',
    recommendedSubject: 'Biology Classification, Organic Functional Groups'
  },
  {
    id: 'problem_solving',
    title: '12. Problem-Solving Mind Map',
    badge: 'Numerical Strategy',
    category: 'Exam & Roadmap',
    description: 'Diagnostic problem solver: Given Data -> Select Formula -> Strategy -> Sanity Check.',
    iconName: 'Target',
    color: 'from-violet-600 to-purple-800',
    recommendedSubject: 'JEE / NEET Numerical Problems'
  },
  {
    id: 'exam_prep',
    title: '13. Exam Preparation Mind Map',
    badge: 'Board Prep',
    category: 'Exam & Roadmap',
    description: 'High-yield board exam map with 5-star priority tags, NCERT tips & trick questions.',
    iconName: 'Award',
    color: 'from-red-500 to-rose-700',
    recommendedSubject: 'Class 10/12 Board Exam Preparation'
  },
  {
    id: 'chapter_roadmap',
    title: '14. Complete Chapter Roadmap',
    badge: '0 to 100% Path',
    category: 'Exam & Roadmap',
    description: 'Progressive mastery roadmap from beginner foundations to expert numerical mastery.',
    iconName: 'Compass',
    color: 'from-blue-600 to-indigo-800',
    recommendedSubject: 'Entire Syllabus Chapter Planning'
  },
  {
    id: 'dependency_map',
    title: '15. Prerequisite & Dependency Map',
    badge: 'Prerequisites',
    category: 'Structural',
    description: 'Dependency graph linking required prior concepts -> current topics -> future chapters.',
    iconName: 'GitFork',
    color: 'from-teal-600 to-cyan-800',
    recommendedSubject: 'Calculus, Electrostatics, Mechanics'
  },
  {
    id: 'master_map',
    title: '16. Advanced Master Mind Map',
    badge: 'Ultimate All-in-One',
    category: 'Exam & Roadmap',
    description: 'Multi-dimensional master dashboard combining concepts, formulas, derivations & exam tips.',
    iconName: 'Sparkles',
    color: 'from-amber-500 via-purple-600 to-indigo-700',
    recommendedSubject: 'Comprehensive Final Revision'
  }
];
