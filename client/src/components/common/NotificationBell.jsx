import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, BookOpen, FileText, AlertTriangle, Info, X } from 'lucide-react';
import api from '../../api/axios';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

const typeConfig = {
  QUIZ: { icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
  MATERIAL: { icon: FileText, color: 'text-success', bg: 'bg-success/10' },
  RISK: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  SYSTEM: { icon: Info, color: 'text-secondary', bg: 'bg-secondary/10' },
  RECOMMENDATION: { icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications?limit=15');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      // Silently fail — polling errors shouldn't disrupt UX
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read');
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-surface-alt transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 max-h-[480px] bg-surface border border-border-base rounded-xl shadow-level3 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-base bg-surface-alt/50">
            <h3 className="font-bold text-text-primary text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Read All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-text-secondary mx-auto mb-2 opacity-30" />
                <p className="text-sm text-text-secondary">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const config = typeConfig[n.type] || typeConfig.SYSTEM;
                const IconComp = config.icon;
                return (
                  <div
                    key={n._id}
                    className={`flex gap-3 p-3 border-b border-border-subtle hover:bg-surface-alt/50 transition-colors cursor-pointer ${
                      !n.isRead ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => !n.isRead && handleMarkRead(n._id)}
                  >
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                      <IconComp className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-xs font-bold ${!n.isRead ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {n.title}
                        </h4>
                        {!n.isRead && (
                          <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-text-muted mt-1 block">{formatTime(n.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
