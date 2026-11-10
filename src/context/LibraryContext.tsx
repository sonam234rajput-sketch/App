import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { QuizResult, MindMapData, NoteItem, ChatSession, StudyTimerSession, AnswerEvaluation, YouTubeAnalysisSession } from '../types';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isOffline = errMsg.includes('offline') || errMsg.includes('backend') || errMsg.includes('unavailable') || errMsg.includes('network');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
  if (!isOffline) {
    throw new Error(JSON.stringify(errInfo));
  }
}

/**
 * Recursively strips undefined fields from objects and arrays so Firestore never rejects the write.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned;
  }
  return data;
}

interface LibraryContextType {
  quizzes: QuizResult[];
  saveQuiz: (quiz: QuizResult) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;

  mindmaps: MindMapData[];
  saveMindMap: (map: MindMapData) => Promise<void>;
  deleteMindMap: (id: string) => Promise<void>;

  notes: NoteItem[];
  saveNote: (note: NoteItem) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  chatSessions: ChatSession[];
  saveChatSession: (session: ChatSession) => Promise<void>;
  deleteChatSession: (id: string) => Promise<void>;

  timerSessions: StudyTimerSession[];
  recordTimerSession: (minutes: number, sound: string) => Promise<void>;

  evaluations: AnswerEvaluation[];
  saveEvaluation: (evalItem: AnswerEvaluation) => Promise<void>;
  deleteEvaluation: (id: string) => Promise<void>;

  youtubeSessions: YouTubeAnalysisSession[];
  activeYouTubeSession: YouTubeAnalysisSession | null;
  setActiveYouTubeSession: (session: YouTubeAnalysisSession | null) => void;
  saveYouTubeSession: (session: YouTubeAnalysisSession) => Promise<void>;
  deleteYouTubeSession: (id: string) => Promise<void>;

  folders: string[];
  addFolder: (folderName: string) => void;
  loading: boolean;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [quizzes, setQuizzes] = useState<QuizResult[]>([]);
  const [mindmaps, setMindmaps] = useState<MindMapData[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [timerSessions, setTimerSessions] = useState<StudyTimerSession[]>([]);
  const [evaluations, setEvaluations] = useState<AnswerEvaluation[]>([]);
  const [youtubeSessions, setYoutubeSessions] = useState<YouTubeAnalysisSession[]>(() => {
    try {
      const saved = localStorage.getItem('aarohai_youtube_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeYouTubeSession, setActiveYouTubeSession] = useState<YouTubeAnalysisSession | null>(null);
  const [folders, setFolders] = useState<string[]>(['10th Physics', 'Class 12 Biology', 'JEE Revision', 'General Study']);
  const [loading, setLoading] = useState(true);

  // Sync with Firestore
  useEffect(() => {
    if (!userId) {
      setQuizzes([]);
      setMindmaps([]);
      setNotes([]);
      setChatSessions([]);
      setTimerSessions([]);
      setEvaluations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubQuizzes = onSnapshot(collection(db, 'users', userId, 'quizzes'), (snap) => {
      setQuizzes(snap.docs.map(d => ({ ...d.data(), id: d.id } as QuizResult)));
    }, (error) => {
      console.warn('[Quizzes Sync Notice]:', error?.message);
    });

    const unsubMindmaps = onSnapshot(collection(db, 'users', userId, 'mindmaps'), (snap) => {
      setMindmaps(snap.docs.map(d => ({ ...d.data(), id: d.id } as MindMapData)));
    }, (error) => {
      console.warn('[Mindmaps Sync Notice]:', error?.message);
    });

    const unsubNotes = onSnapshot(collection(db, 'users', userId, 'notes'), (snap) => {
      setNotes(snap.docs.map(d => ({ ...d.data(), id: d.id } as NoteItem)));
    }, (error) => {
      console.warn('[Notes Sync Notice]:', error?.message);
    });

    const unsubChats = onSnapshot(collection(db, 'users', userId, 'chats'), (snap) => {
      setChatSessions(snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatSession)));
    }, (error) => {
      console.warn('[Chats Sync Notice]:', error?.message);
    });

    const unsubEvals = onSnapshot(collection(db, 'users', userId, 'evaluations'), (snap) => {
      setEvaluations(snap.docs.map(d => ({ ...d.data(), id: d.id } as any as AnswerEvaluation)));
    }, (error) => {
      console.warn('[Evaluations Sync Notice]:', error?.message);
    });

    const unsubYouTube = onSnapshot(collection(db, 'users', userId, 'youtube_analyses'), (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as YouTubeAnalysisSession));
      setYoutubeSessions(list);
      try {
        localStorage.setItem('aarohai_youtube_sessions', JSON.stringify(list));
      } catch (_) {}
    }, (error) => {
      console.warn('[YouTube Analyses Sync Notice]:', error?.message);
    });

    setLoading(false);

    return () => {
      unsubQuizzes();
      unsubMindmaps();
      unsubNotes();
      unsubChats();
      unsubEvals();
      unsubYouTube();
    };
  }, [userId]);

  const saveQuiz = async (quiz: QuizResult) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'users', userId, 'quizzes', quiz.id), sanitizeForFirestore({ ...quiz, userId }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/quizzes/${quiz.id}`);
    }
  };

  const deleteQuiz = async (id: string) => {
    setQuizzes(prev => prev.filter(q => q.id !== id));
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'quizzes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/quizzes/${id}`);
    }
  };

  const saveMindMap = async (map: MindMapData) => {
    if (!userId) return;
    const id = map.id || `mm-${Date.now()}`;
    try {
      await setDoc(doc(db, 'users', userId, 'mindmaps', id), sanitizeForFirestore({ ...map, id, userId }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/mindmaps/${id}`);
    }
  };

  const deleteMindMap = async (id: string) => {
    setMindmaps(prev => prev.filter(m => m.id !== id));
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'mindmaps', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/mindmaps/${id}`);
    }
  };

  const saveNote = async (note: NoteItem) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'users', userId, 'notes', note.id), sanitizeForFirestore({ ...note, userId }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/notes/${note.id}`);
    }
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'notes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/notes/${id}`);
    }
  };

  const saveChatSession = async (session: ChatSession) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'users', userId, 'chats', session.id), sanitizeForFirestore({ ...session, userId }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/chats/${session.id}`);
    }
  };

  const deleteChatSession = async (id: string) => {
    setChatSessions(prev => prev.filter(c => c.id !== id));
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'chats', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/chats/${id}`);
    }
  };

  const recordTimerSession = async (minutes: number, sound: string) => {
    if (!userId) return;
    const id = `tm-${Date.now()}`;
    const newSession: StudyTimerSession = {
      id,
      durationMinutes: minutes,
      completedAt: new Date().toISOString(),
      soundUsed: sound
    };
    try {
      await setDoc(doc(db, 'users', userId, 'timer_sessions', id), sanitizeForFirestore({ ...newSession, userId }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/timer_sessions/${id}`);
    }
  };

  const saveEvaluation = async (evalItem: AnswerEvaluation) => {
    if (!userId) return;
    const id = (evalItem as any).id || `ev-${Date.now()}`;
    try {
      await setDoc(doc(db, 'users', userId, 'evaluations', id), sanitizeForFirestore({ 
        ...evalItem, 
        id, 
        userId, 
        date: evalItem.date || new Date().toLocaleDateString('en-IN') 
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/evaluations/${id}`);
    }
  };

  const deleteEvaluation = async (id: string) => {
    setEvaluations(prev => prev.filter(e => (e as any).id !== id));
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'evaluations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/evaluations/${id}`);
    }
  };

  const saveYouTubeSession = async (session: YouTubeAnalysisSession) => {
    const updated = [session, ...youtubeSessions.filter(s => s.id !== session.id)];
    setYoutubeSessions(updated);
    try {
      localStorage.setItem('aarohai_youtube_sessions', JSON.stringify(updated));
    } catch (_) {}

    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId, 'youtube_analyses', session.id), sanitizeForFirestore({ ...session, userId }));
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${userId}/youtube_analyses/${session.id}`);
      }
    }
  };

  const deleteYouTubeSession = async (id: string) => {
    const updated = youtubeSessions.filter(s => s.id !== id);
    setYoutubeSessions(updated);
    if (activeYouTubeSession?.id === id) {
      setActiveYouTubeSession(null);
    }
    try {
      localStorage.setItem('aarohai_youtube_sessions', JSON.stringify(updated));
    } catch (_) {}

    if (userId) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'youtube_analyses', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}/youtube_analyses/${id}`);
      }
    }
  };

  const addFolder = (folderName: string) => {
    if (folderName && !folders.includes(folderName)) {
      setFolders(prev => [...prev, folderName]);
    }
  };

  return (
    <LibraryContext.Provider
      value={{
        quizzes,
        saveQuiz,
        deleteQuiz,
        mindmaps,
        saveMindMap,
        deleteMindMap,
        notes,
        saveNote,
        deleteNote,
        chatSessions,
        saveChatSession,
        deleteChatSession,
        timerSessions,
        recordTimerSession,
        evaluations,
        saveEvaluation,
        deleteEvaluation,
        youtubeSessions,
        activeYouTubeSession,
        setActiveYouTubeSession,
        saveYouTubeSession,
        deleteYouTubeSession,
        folders,
        addFolder,
        loading
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
