import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  read: boolean;
  createdAt: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  sendNotification: (title: string, message: string, type: Notification['type']) => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<Notification | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      // Show toast for new unread notifications that are very recent
      const newest = newNotifications[0];
      if (newest && !newest.read) {
        // Only toast if it's within the last 10 seconds (avoid toasting historical data on load)
        const now = Date.now();
        const created = newest.createdAt?.seconds ? newest.createdAt.seconds * 1000 : now;
        if (now - created < 10000) {
          setToast(newest);
          setTimeout(() => setToast(null), 5000);
          
          // Browser Notification if permitted
          if (Notification.permission === 'granted') {
            new Notification(newest.title, { body: newest.message });
          }
        }
      }

      setNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, [profile]);

  const markAsRead = async (id: string) => {
    try {
      const docRef = doc(db, 'notifications', id);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const sendNotification = async (title: string, message: string, type: Notification['type']) => {
    if (!profile?.uid) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: profile.uid,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, sendNotification, requestPermission }}>
      {children}
      
      {/* Universal Toast Container */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm bg-surface-container-highest border border-outline-variant/30 rounded-3xl p-4 shadow-2xl flex gap-4 items-center"
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              toast.type === 'alert' ? 'bg-error/10 text-error' :
              toast.type === 'success' ? 'bg-primary/10 text-primary' :
              'bg-tertiary/10 text-tertiary'
            }`}>
              <span className="material-symbols-outlined">
                {toast.type === 'alert' ? 'warning' : toast.type === 'success' ? 'check_circle' : 'notifications'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{toast.title}</div>
              <div className="text-xs text-on-surface-variant line-clamp-1">{toast.message}</div>
            </div>
            <button onClick={() => setToast(null)} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
