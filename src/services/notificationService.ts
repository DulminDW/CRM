import { supabase } from '../lib/supabase';

export interface NotificationRecord {
  id: string;
  user_id: string;
  event_type: 'QUOTE_SHARED' | 'CHAT_MENTION' | 'SPECIAL_RATE_CREATED' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  reference_type?: string | null;
  reference_id?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export const notificationService = {
  /**
   * Broadcast a notification to all internal team members (Admins and Sales Staff)
   * except optionally the sender.
   */
  async notifyTeamOnQuoteShared(params: {
    senderId: string;
    senderName: string;
    agencyName: string;
    hotelNames: string[];
    quoteReference: string;
  }) {
    try {
      // Get all active users
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('status', 'ACTIVE');

      if (error || !users || users.length === 0) return;

      const hotelsStr = params.hotelNames.join(', ');
      const title = `Rate Quote Dispatched: ${params.agencyName}`;
      const message = `${params.senderName} shared rates for [${hotelsStr}] to ${params.agencyName} (Ref: ${params.quoteReference}).`;

      // Build notifications for all users (or exclude sender, or include all for confirmation)
      const notificationsToInsert = users.map((u) => ({
        user_id: u.id,
        event_type: 'QUOTE_SHARED',
        title: title,
        message: message,
        reference_type: 'QUOTE',
        reference_id: null,
        is_read: false,
      }));

      await supabase.from('notifications').insert(notificationsToInsert);
    } catch (err) {
      console.warn('Failed to broadcast quote notification:', err);
    }
  },

  /**
   * Send mention notifications to tagged users
   */
  async notifyMentions(params: {
    mentionedUserIds: string[];
    senderName: string;
    context: string;
  }) {
    try {
      if (params.mentionedUserIds.length === 0) return;

      const notifications = params.mentionedUserIds.map((userId) => ({
        user_id: userId,
        event_type: 'CHAT_MENTION',
        title: `${params.senderName} mentioned you`,
        message: params.context,
        reference_type: 'MENTION',
        reference_id: null,
        is_read: false,
      }));

      await supabase.from('notifications').insert(notifications);
    } catch (err) {
      console.warn('Failed to notify mentions:', err);
    }
  },

  /**
   * Fetch notifications for current user
   */
  async getMyNotifications(): Promise<{ data: NotificationRecord[]; unreadCount: number }> {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const currentUserId = userRes?.user?.id;
      if (!currentUserId) return { data: [], unreadCount: 0 };

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const items = (data || []) as NotificationRecord[];
      const unreadCount = items.filter((n) => !n.is_read).length;

      return { data: items, unreadCount };
    } catch (err) {
      console.error('Error fetching notifications:', err);
      return { data: [], unreadCount: 0 };
    }
  },

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const currentUserId = userRes?.user?.id;
      if (!currentUserId) return false;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      return !error;
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      return false;
    }
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      return !error;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  },
};

