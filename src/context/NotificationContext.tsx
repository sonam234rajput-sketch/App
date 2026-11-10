import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  status?: 'Pending' | 'Sending' | 'Success' | 'Failed';
}

interface NotificationContextType {
  notifications: Notification[];
  markNotificationAsRead: (id: string) => Promise<void>;
  notificationHistory: any[];
  fetchNotificationHistory: () => Promise<void>;
  sendVerifiedNotification: (title: string, message: string, audience: 'all' | 'specific', recipientEmail?: string) => Promise<any>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
    });

    return unsub;
  }, [user]);

  const fetchNotificationHistory = async () => {
     // Fetch from Firestore
     const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
     const snapshot = await getDocs(q);
     const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     setNotificationHistory(history);
  };

  const markNotificationAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  };

  const sendVerifiedNotification = async (title: string, message: string, audience: 'all' | 'specific', recipientEmail?: string) => {
    // Send via API route
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, audience, recipientEmail })
    });
    return await res.json();
  };

  return (
    <NotificationContext.Provider value={{ notifications, markNotificationAsRead, notificationHistory, fetchNotificationHistory, sendVerifiedNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
