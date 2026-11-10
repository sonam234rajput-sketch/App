import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Banner {
  id: string;
  title: string;
  description: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  isActive: boolean;
  createdAt: string;
}

interface BannerContextType {
  banners: Banner[];
  saveBanner: (banner: Omit<Banner, 'id' | 'createdAt'>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const bns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
      setBanners(bns);
    });
    return unsub;
  }, []);

  const saveBanner = async (banner: Omit<Banner, 'id' | 'createdAt'>) => {
    await addDoc(collection(db, 'banners'), { ...banner, createdAt: new Date().toISOString() });
  };

  const deleteBanner = async (id: string) => {
    await deleteDoc(doc(db, 'banners', id));
  };

  return (
    <BannerContext.Provider value={{ banners, saveBanner, deleteBanner }}>
      {children}
    </BannerContext.Provider>
  );
};

export const useBanners = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error('useBanners must be used within a BannerProvider');
  }
  return context;
};
