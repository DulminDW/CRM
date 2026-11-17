// ==============================================================================
// WINDOW COMPANIES CRM — NOTIFICATIONS CENTER
// Live alerts for Dispatched Quotes, Team Mentions, Tasks, and Commercial Actions.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Send,
  AlertTriangle,
  RefreshCw,
  Check,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService, NotificationRecord } from '../services/notificationService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AggregatedNotificationItem {
  id: string;
  type: 'QUOTE_SHARED' | 'CHAT_MENTION' | 'TASK_ASSIGNED' | 'TASK_BLOCKED' | 'TASK_COMPLETED' | 'SYSTEM_ALERT';
  title: string;
  description: string;
  created_at: string;
  read: boolean;
  link?: string;
}

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<AggregatedNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'QUOTES' | 'MENTIONS' | 'TASKS'>('ALL');

  const loadNotifications = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch real notifications from database table
      const [dbNotifRes, tasksRes] = await Promise.all([
        notificationService.getMyNotifications(),
        supabase
          .from('tasks')
          .select('id, title, status, priority, due_date, created_at, assigned_to')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      const items: AggregatedNotificationItem[] = [];

      // Process database notifications (Quotes shared, Mentions, System alerts)
      (dbNotifRes.data || []).forEach((n: NotificationRecord) => {
        items.push({
          id: n.id,
          type: n.event_type as any,
          title: n.title,
          description: n.message,
          created_at: n.created_at,
          read: n.is_read,
          link: n.event_type === 'QUOTE_SHARED' ? '/sales-activities' : n.event_type === 'CHAT_MENTION' ? '/team-chat' : undefined,
        });
      });

      // Process operational tasks
      (tasksRes.data || []).forEach((t) => {
        if (t.status === 'BLOCKED') {
          items.push({
            id: `task-blocked-${t.id}`,
            type: 'TASK_BLOCKED',
            title: `Task Blocked: ${t.title}`,
            description: `High-priority blocker flagged on task due ${t.due_date}`,
            created_at: t.created_at,
            read: false,
            link: '/tasks',
          });
        } else if (t.status === 'COMPLETED') {
          items.push({
            id: `task-done-${t.id}`,
            type: 'TASK_COMPLETED',
            title: `Task Completed: ${t.title}`,
            description: `Successfully closed and verified.`,
            created_at: t.created_at,
            read: true,
            link: '/tasks',
          });
        } else {
          items.push({
            id: `task-assigned-${t.id}`,
            type: 'TASK_ASSIGNED',
            title: `Task Assignment: ${t.title}`,
            description: `Priority: ${t.priority} • Due: ${t.due_date}`,
            created_at: t.created_at,
            read: false,
            link: '/tasks',
          });
        }
      });

      // Sort by newest first
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(items);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkSingleAsRead = async (id: string) => {
    if (!id.startsWith('task-')) {
      await notificationService.markAsRead(id);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const filteredItems = notifications.filter((item) => {
    if (filter === 'UNREAD') return !item.read;
    if (filter === 'QUOTES') return item.type === 'QUOTE_SHARED';
    if (filter === 'MENTIONS') return item.type === 'CHAT_MENTION';
    if (filter === 'TASKS') return item.type.startsWith('TASK_');
    return true;
  });

  const unreadTotal = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification Center</h1>
            {unreadTotal > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-[#1455D9]">
                {unreadTotal} Unread
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                All Caught Up
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Real-time notifications for dispatched rates, user @mentions, and task assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1455D9]' : ''}`} />
          </button>

          {unreadTotal > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {(
          [
            { key: 'ALL', label: `All (${notifications.length})` },
            { key: 'UNREAD', label: `Unread (${unreadTotal})` },
            { key: 'QUOTES', label: 'Rate Dispatches' },
            { key: 'MENTIONS', label: 'Mentions' },
            { key: 'TASKS', label: 'Tasks' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === tab.key
                ? 'bg-[#1455D9] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 text-[#1455D9] animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold">Loading live notifications...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No notifications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {filter === 'UNREAD'
                ? 'You have read all your notifications!'
                : 'New notifications will appear here when rates are shared, colleagues mention you, or tasks are assigned.'}
            </p>
          </div>
        ) : (
          filteredItems.map((n) => {
            const isQuote = n.type === 'QUOTE_SHARED';
            const isMention = n.type === 'CHAT_MENTION';
            const isBlocked = n.type === 'TASK_BLOCKED';

            return (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkSingleAsRead(n.id)}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  !n.read
                    ? 'bg-blue-50/40 border-blue-200 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isQuote
                        ? 'bg-emerald-100 text-emerald-700'
                        : isMention
                        ? 'bg-purple-100 text-purple-700'
                        : isBlocked
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-[#1455D9]'
                    }`}
                  >
                    {isQuote ? (
                      <Send className="w-4 h-4" />
                    ) : isMention ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : isBlocked ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#1455D9]" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{n.description}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                      {n.link && (
                        <Link
                          to={n.link}
                          className="text-[#1455D9] font-bold hover:underline flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!n.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkSingleAsRead(n.id);
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-[#1455D9] px-2 py-1 rounded-lg hover:bg-white"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
