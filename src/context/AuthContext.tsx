import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

interface AuthContextType {
  user: UserProfile | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  registerUser: (name: string, mobile: string, email: string) => Promise<void>;
  isOwner: boolean;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  viewerData: { type: string; data: any } | null;
  setViewerData: (data: { type: string; data: any } | null) => void;
  language: 'English' | 'Hindi' | 'Hinglish';
  setLanguage: (lang: 'English' | 'Hindi' | 'Hinglish') => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('aarohai_theme') as any) || 'light';
  });

  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Hinglish'>(() => {
    return (localStorage.getItem('aarohai_language') as any) || 'Hinglish';
  });

  const [activeTab, setActiveTab] = useState<string>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [viewerData, setViewerData] = useState<{ type: string; data: any } | null>(null);

  useEffect(() => {
    localStorage.setItem('aarohai_language', language);
  }, [language]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const isOwnerEmail = fbUser.email?.toLowerCase() === 'sonamkumari40411@gmail.com' || fbUser.email?.toLowerCase() === 'sonam234rajput@gmail.com' || fbUser.email?.toLowerCase() === 'rishabhsinghrajput8877@gmail.com';
        
        const cachedReg = localStorage.getItem(`aarohai_registered_${fbUser.uid}`) === 'true';

        let profile: UserProfile = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Student',
          email: fbUser.email || '',
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
          isOwner: isOwnerEmail,
          isRegistered: isOwnerEmail || cachedReg,
          joinedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };

        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            profile = {
              ...profile,
              ...data,
              isRegistered: isOwnerEmail || cachedReg || Boolean(data.mobile && data.name),
              lastLoginAt: new Date().toISOString()
            };
            await setDoc(userRef, { lastLoginAt: new Date().toISOString() }, { merge: true });
          } else {
            await setDoc(userRef, profile);
          }
        } catch (error) {
          console.warn('[AarohAI Auth] Operating with cached/auth profile:', error);
        }
        setUser(profile);
      } else {
        // Check if there is a guest-registered profile in local storage
        const guestId = localStorage.getItem('aarohai_guest_uid');
        if (guestId) {
          try {
            const guestSnap = await getDoc(doc(db, 'users', guestId));
            if (guestSnap.exists()) {
              setUser(guestSnap.data() as UserProfile);
            }
          } catch (_) {}
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const registerUser = async (name: string, mobile: string, email: string) => {
    const currentUid = user?.id || auth.currentUser?.uid || `user-${Date.now()}`;
    const now = new Date().toISOString();
    const isOwnerEmail = email.toLowerCase() === 'sonamkumari40411@gmail.com' || email.toLowerCase() === 'sonam234rajput@gmail.com' || email.toLowerCase() === 'rishabhsinghrajput8877@gmail.com';

    const registeredProfile: UserProfile = {
      id: currentUid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      isOwner: isOwnerEmail,
      isRegistered: true,
      joinedAt: user?.joinedAt || now,
      lastLoginAt: now
    };

    setUser(registeredProfile);
    localStorage.setItem(`aarohai_registered_${currentUid}`, 'true');
    localStorage.setItem('aarohai_guest_uid', currentUid);

    try {
      await setDoc(doc(db, 'users', currentUid), registeredProfile, { merge: true });
    } catch (e) {
      console.warn('Register user Firestore offline:', e);
    }

    try {
      fetch('/api/owner/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registeredProfile)
      }).catch(() => {});
    } catch (_) {}
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('aarohai_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        console.info('[Auth] Google popup closed by user.');
        return;
      }
      console.warn('Google login notice:', err?.message || err);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setActiveTab('home');
  };

  const isOwner = user?.isOwner === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        theme,
        toggleTheme,
        loginWithGoogle,
        logout,
        registerUser,
        isOwner,
        activeTab,
        setActiveTab,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        viewerData,
        setViewerData,
        language,
        setLanguage,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
