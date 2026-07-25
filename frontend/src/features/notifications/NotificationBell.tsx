import React, { useState, useEffect } from 'react';
import useUIStore from '@store/uiStore';
import { api } from '@config/api';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, setNotifications } = useUIStore();
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data.notifications, res.data.data.unreadCount);
      }
    } catch (err) {
      console.error('[NotificationBell] Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('[NotificationBell] Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('[NotificationBell] Failed to mark all read:', err);
    }
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center shadow-xs"
      >
        <Bell className="w-4 h-4 text-slate-600 hover:text-sky-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-sky-600 text-white text-[9px] font-bold font-mono rounded-full flex items-center justify-center animate-pulse border border-white shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white p-4 rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold font-display text-slate-900">CityMind Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-mono rounded-md font-bold border border-sky-200">
                    {unreadCount} New
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-mono text-sky-600 font-bold hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => !n.read && handleMarkRead(n._id)}
                    className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      n.read
                        ? 'bg-slate-50 border-slate-200/60 text-slate-500'
                        : 'bg-sky-50/80 border-sky-200 text-slate-900 font-semibold'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-mono text-[10px] text-sky-700 uppercase font-bold tracking-wider">
                        {n.type.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
