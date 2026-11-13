// ==============================================================================
// WINDOW COMPANIES CRM — NOTIFICATIONS CENTER
// Live alerts for Dispatched Quotes, Daily Task Assignments, and Blockers.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  RefreshCw,
  Check
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface NotificationItem {
  id: string;
  type: 'QUOTE_DISPATCHED' | 'TASK_ASSIGNED' | 'TASK_BLOCKED' | 'TASK_COMPLETED' | 'SYSTEM';
  title: string;
  description: string;
  created_at: string;
  read: boolean;
  link?: string;
}

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'TASKS' | 'QUOTES'>('ALL');

  const loadNotifications = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Aggregate real notifications from Tasks and Quotes
      const [tasksRes, quotesRes] = await Promise.all([
        supabase.from('tasks').select('id, title, status, priority, due_date, created_at, assigned_to').order('created_at', { ascending: false }).limit(20),
        supabase.from('quotes').select('id, created_at, status, hotel_id, agency_id, metadata').order('created_at', { ascending: false }).limit(20)
      ]);

      const items: NotificationItem[] = [];

      // 1. Process recent tasks
      (tasksRes.data || []).forEach((t) => {
        if (t.status === 'BLOCKED') {
          items.push({
            id: `task-blocked-${t.id}`,
            type: 'TASK_BLOCKED',
            title: `Task Blocked: ${t.title}`,
            description: `High-priority blocker flagged on task due ${t.due_date}`,
            created_at: t.created_at,
            read: false,
            link: '/tasks'
          });
        } else if (t.status === 'COMPLETED') {
          items.push({
            id: `task-done-${t.id}`,
            type: 'TASK_COMPLETED',
            title: `Task Completed: ${t.title}`,
            description: `Successfully closed and verified.`,
            created_at: t.created_at,
            read: true,
            link: '/tasks'
          });
        } else {
          items.push({
            id: `task-assigned-${t.id}`,
            type: 'TASK_ASSIGNED',
            title: `New Task Assignment: ${t.title}`,
            description: `Priority: ${t.priority} • Due: ${t.due_date}`,
            created_at: t.created_at,
            read: false,
            link: '/tasks'
          });
        }
      });

      // 2. Process dispatched quotes
      (quotesRes.data || []).forEach((q) => {
        items.push({
          id: `quote-${q.id}`,
          type: 'QUOTE_DISPATCHED',
          title: `Rate Quotation Dispatched`,
          description: `Rates shared via email handoff to client. Status: ${q.status || 'DISPATCHED'}`,
          created_at: q.created_at,
          read: true,
          link: '/rates/history'
        });
      });

      // Sort by latest
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

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filteredItems = notifications.filter((item) => {
    if (filter === 'UNREAD') return !item.read;
    if (filter === 'TASKS') return item.type.startsWith('TASK_');
    if (filter === 'QUOTES') return item.type === 'QUOTE_DISPATCHED';
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Feed
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Real-time feed of task assignments, operational blockers, and commercial rate share dispatches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm shadow-sm"
          >
            <Check className="w-4 h-4" /> Mark All as Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            filter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Activity ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            filter === 'UNREAD' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({notifications.filter((n) => !n.read).length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('TASKS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            filter === 'TASKS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Daily Tasks
        </button>

        <button
          type="button"
          onClick={() => setFilter('QUOTES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            filter === 'QUOTES' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Dispatched Quotes
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Bell className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No notifications to display</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === 'UNREAD' ? 'You have caught up with all unread alerts!' : 'New task and rate dispatch events will appear here.'}
            </p>
          </div>
        ) : (
          filteredItems.map((n) => {
            const isBlocked = n.type === 'TASK_BLOCKED';
            const isCompleted = n.type === 'TASK_COMPLETED';
            const isQuote = n.type === 'QUOTE_DISPATCHED';

            return (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  n.read ? 'bg-white hover:bg-slate-50/50' : 'bg-blue-50/30 hover:bg-blue-50/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isBlocked
                        ? 'bg-red-50 text-red-600'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-600'
                        : isQuote
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {isBlocked ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isQuote ? (
                      <Send className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 text-sm">{n.title}</h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{n.description}</p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {n.link && (
                  <a
                    href={n.link}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    View
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
