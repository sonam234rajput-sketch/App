import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const NotificationBell: React.FC = () => {
  const { notifications, markNotificationAsRead } = useNotifications();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Notifications ({notifications.length})
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.isRead) markNotificationAsRead(notif.id);
                  }}
                  className={`p-3.5 transition-all text-xs space-y-1 cursor-pointer ${
                    notif.isRead
                      ? 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      : 'bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {notif.message}
                  </p>
                  {notif.status && (
                    <span className={`text-[10px] font-bold ${
                      notif.status === 'Success' ? 'text-emerald-600' :
                      notif.status === 'Failed' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      Status: {notif.status}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
