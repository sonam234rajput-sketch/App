export interface UserProfile {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  avatar: string;
  isOwner: boolean;
  isRegistered?: boolean;
  isRestricted?: boolean;
  joinedAt: string;
  lastLoginAt?: string;
}

export type NavTab =
  | 'home'
  | 'chat'
  | 'quiz'
  | 'answer-checker'
  | 'mindmap'
  | 'notes'
  | 'timer'
  | 'analytics'
  | 'ncert-library'
  | 'saved-library'
  | 'help'
  | 'about'
  | 'api-keys'
  | 'owner'
  | 'settings'
  | 'youtube';

export interface YouTubeTimestampItem {
  timestamp: string;
  seconds?: number;
  topic: string;
  summary: string;
}

export interface SingleVideoAnalysis {
  url: string;
  videoId: string;
  title: string;
  channelTitle?: string;
  topicsCovered: string[];
  keyDefinitions: { term: string; definition: string; timestamp?: string }[];
  keyConcepts: { concept: string; explanation: string; timestamp?: string }[];
  teacherExamples: { title: string; explanation: string; timestamp?: string }[];
  importantFormulas: { formula: string; context: string; timestamp?: string }[];
  importantFacts: string[];
  examImportantTopics: string[];
  potentialQuestions: { question: string; answerSummary: string; questionType?: string }[];
  hindiSimplifiedSummary: string;
  timestamps: YouTubeTimestampItem[];
}

export interface YouTubeAnalysisSession {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  videoUrls: string[];
  videos: SingleVideoAnalysis[];
  combinedSummary: {
    overview: string;
    allTopics: string[];
    allFormulas: { formula: string; context: string }[];
    coreTakeaways: string[];
    examMasterChecklist: string[];
    hindiOverview: string;
  };
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  maskedKey: string;
  isActive: boolean;
  successCount: number;
  errorCount: number;
  status: 'Healthy 🟢' | 'Quota Exhausted (Minute) 🟡' | 'Quota Exhausted (Daily) 🟠' | 'Invalid / Error 🔴';
  lastUsed?: string;
  lastError?: string;
  retryAfter?: string;
  projectId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachmentName?: string;
  attachmentType?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
  isArchived?: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizResult {
  id: string;
  title: string;
  subject: string;
  className: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  date: string;
  questions: QuizQuestion[];
  userAnswers: Record<number, number | null>;
}

export interface AnswerEvaluation {
  extractedQuestion?: string;
  extractedAnswer?: string;
  marksObtained: number;
  maxMarks: number;
  percentage?: number;
  grade?: string;
  correctPoints: string[];
  missingPoints: string[];
  incorrectConcepts?: string[];
  spellingGrammarTips?: string;
  handwritingReadability?: string;
  examWritingTips?: string[];
  modelAnswer: string;
  recommendedFormat?: string;
  studentStyleDetected?: string;
  writingStyleFeedback?: string;
  date?: string;
  subject?: string;
}

export interface DerivationStep {
  stepNumber: number;
  title: string;
  mathExpr: string;
  explanation: string;
}

export interface FormulaDetail {
  name: string;
  equation: string;
  variables?: string;
  unit?: string;
}

export interface DeepMindMapNode {
  id: string;
  label: string;
  type?: 'root' | 'topic' | 'subtopic' | 'concept' | 'formula' | 'derivation' | 'comparison' | 'process' | 'cause_effect' | 'timeline' | 'exam_tip' | 'prerequisite';
  level?: number;
  summary?: string;
  detail?: string;
  formula?: string;
  formulas?: FormulaDetail[];
  derivationSteps?: DerivationStep[];
  examples?: string[];
  applications?: string[];
  examTips?: string[];
  commonMistakes?: string[];
  crossLinks?: string[];
  keyPoints?: string[];
  comparisonData?: { entityA: string; entityB: string; difference: string }[];
  causeEffectData?: { cause: string; effect: string }[];
  processStepData?: { stepNumber: number; action: string; result: string }[];
  color?: string;
  children?: DeepMindMapNode[];
}

export type MindMapTemplateId =
  | 'hierarchical'
  | 'radial'
  | 'detailed_concept'
  | 'flowchart'
  | 'process_step'
  | 'formula_equation'
  | 'derivation'
  | 'comparison'
  | 'cause_effect'
  | 'timeline'
  | 'classification'
  | 'problem_solving'
  | 'exam_prep'
  | 'chapter_roadmap'
  | 'dependency_map'
  | 'master_map';

export interface MindMapSubNode {
  label: string;
  detail?: string;
  formula?: string;
  keyPoints?: string[];
}

export interface MindMapBranchNode {
  id: string;
  title: string;
  color: string;
  summary?: string;
  subNodes: MindMapSubNode[];
  childrenNode?: DeepMindMapNode;
}

export interface MindMapData {
  id?: string;
  rootTitle: string;
  subtitle?: string;
  summary?: string;
  boardOrExam?: string;
  learningLevel?: string;
  templateId?: MindMapTemplateId | string;
  designStyle?: string;
  subject?: string;
  className?: string;
  date?: string;
  branches: MindMapBranchNode[];
  rootNode?: DeepMindMapNode;
}

export interface NoteItem {
  id: string;
  title: string;
  subject: string;
  className: string;
  chapter: string;
  topic: string;
  contentMarkdown: string;
  createdAt: string;
  folder?: string;
}

export interface StudyTimerSession {
  id: string;
  durationMinutes: number;
  completedAt: string;
  soundUsed: string;
}

export interface FeedbackItem {
  id: string;
  userName: string;
  userEmail: string;
  category: string;
  subject: string;
  message: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  createdAt: string;
  response?: string;
}

export interface KeyHealthStats {
  totalKeys: number;
  keys: ApiKeyInfo[];
}

export interface NotificationItem {
  id: string;
  userId: string; // 'broadcast' or specific uid
  title: string;
  message: string;
  type: 'broadcast' | 'system' | 'announcement';
  isRead: boolean;
  createdAt: string;
  linkTab?: string;
  status?: 'Sending...' | 'Successfully Sent' | 'Failed to Send' | 'Pending';
  recipientEmail?: string;
}

export interface NotificationHistoryItem {
  id: string;
  title: string;
  message: string;
  targetAudience: string;
  recipientEmail?: string;
  recipientName?: string;
  status: 'Successfully Sent' | 'Failed to Send' | 'Pending';
  sentAt: string;
  error?: string;
}

export interface CelebrationBanner {
  id: string;
  title?: string;
  description?: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  isActive: boolean;
  createdAt: string;
}

export type PromotionalBanner = CelebrationBanner;

export interface RegisteredUserRecord {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  joinedAt: string;
  lastLoginAt?: string;
  isRestricted?: boolean;
}

