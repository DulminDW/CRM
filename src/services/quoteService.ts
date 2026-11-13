import { supabase } from '../lib/supabase';
import { SelectedRecipient } from '../components/rates/RecipientSelector';

export interface SavedQuoteItem {
  hotel_id: string;
  season_id: string;
  contract_id?: string | null;
  contract_version_id?: string | null;
  contract_reference_snapshot?: string | null;
  rate_sheet_id?: string | null;
  hotel_name_snapshot: string;
  season_label_snapshot: string;
  room_type_snapshot: string;
  meal_plan_snapshot: string;
  rate_category: 'RED' | 'GREEN' | 'YELLOW' | 'SPECIAL_1' | 'SPECIAL_2' | 'SPECIAL_3' | 'CUSTOM';
  quoted_amount: number;
  currency: string;
  custom_notes?: string;
}

export interface CreateQuotePayload {
  agency_id: string;
  market_id?: string | null;
  recipient_scope: 'INDIVIDUAL' | 'ENTIRE_MARKET' | 'ENTIRE_AGENCY';
  email_subject: string;
  email_body_html: string;
  email_body_text?: string;
  recipients: SelectedRecipient[];
  items: SavedQuoteItem[];
  special_conditions?: string;
  notes?: string;
}

export interface QuoteRecipientSnapshot {
  id: string;
  quote_id: string;
  original_member_id?: string | null;
  original_full_name: string;
  original_email: string;
  original_agency_name: string;
  original_market_name?: string | null;
  delivery_status: 'PENDING' | 'SENT' | 'FAILED';
}

export interface QuoteItemSnapshot {
  id: string;
  quote_id: string;
  hotel_id: string;
  season_id: string;
  contract_id?: string | null;
  contract_version_id?: string | null;
  contract_reference_snapshot?: string | null;
  rate_sheet_id?: string | null;
  hotel_name_snapshot: string;
  season_label_snapshot: string;
  room_type_snapshot: string;
  meal_plan_snapshot: string;
  rate_category: string;
  quoted_amount: number;
  currency: string;
  custom_notes?: string | null;
}

export interface QuoteEmailAttempt {
  id: string;
  quote_id: string;
  recipient_id?: string;
  attempt_number: number;
  delivery_status: 'SENDING' | 'SENT' | 'FAILED';
  provider_message_id?: string | null;
  error_message?: string | null;
  attempted_at: string;
}

export interface QuoteRecord {
  id: string;
  quote_reference: string;
  sender_id: string;
  agency_id: string;
  market_id?: string | null;
  recipient_scope: string;
  quote_lifecycle: 'DRAFT' | 'DISPATCHED' | 'CANCELLED';
  email_status: 'NOT_SENT' | 'QUEUED' | 'PARTIALLY_SENT' | 'SENT' | 'FAILED' | 'OPENED_IN_EMAIL_APP' | 'USER_CONFIRMED_SENT';
  email_subject: string;
  email_body_html: string;
  email_body_text?: string | null;
  created_at: string;
  sent_at?: string | null;
  opened_in_app_at?: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  confirmation_notes?: string | null;
  // Joins
  agency_name?: string;
  sender_name?: string;
  confirmer_name?: string;
  recipients_count?: number;
  quote_recipients?: QuoteRecipientSnapshot[];
  quote_items?: QuoteItemSnapshot[];
  quote_email_attempts?: QuoteEmailAttempt[];
}

interface QuoteDbRow {
  id: string;
  quote_reference: string;
  sender_id: string;
  agency_id: string;
  market_id?: string | null;
  recipient_scope: string;
  quote_lifecycle: 'DRAFT' | 'DISPATCHED' | 'CANCELLED';
  email_status: 'NOT_SENT' | 'QUEUED' | 'PARTIALLY_SENT' | 'SENT' | 'FAILED' | 'OPENED_IN_EMAIL_APP' | 'USER_CONFIRMED_SENT';
  email_subject: string;
  email_body_html: string;
  email_body_text?: string | null;
  created_at: string;
  sent_at?: string | null;
  opened_in_app_at?: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  confirmation_notes?: string | null;
  travel_agencies?: { name: string } | null;
  user_profiles?: { full_name: string } | null;
  confirmer_profile?: { full_name: string } | null;
  quote_recipients?: QuoteRecipientSnapshot[];
  quote_items?: QuoteItemSnapshot[];
  quote_email_attempts?: QuoteEmailAttempt[];
}

export const quoteService = {
  /**
   * Save a complete immutable quote snapshot
   */
  async saveQuoteSnapshot(payload: CreateQuotePayload, userId: string): Promise<QuoteRecord> {
    const timestampStr = Date.now().toString().slice(-6);
    const quoteReference = `QT-${new Date().getFullYear()}-${timestampStr}`;

    // 1. Insert master Quote record
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_reference: quoteReference,
        sender_id: userId,
        agency_id: payload.agency_id,
        market_id: payload.market_id || null,
        recipient_scope: payload.recipient_scope,
        quote_lifecycle: 'DRAFT',
        email_status: 'NOT_SENT',
        email_subject: payload.email_subject.trim(),
        email_body_html: payload.email_body_html,
        email_body_text: payload.email_body_text || null
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Error saving quote snapshot header:', quoteError);
      throw quoteError;
    }

    // 2. Insert frozen recipients snapshot
    if (payload.recipients.length > 0) {
      const recipientInserts = payload.recipients.map((rec) => ({
        quote_id: quote.id,
        original_member_id: rec.memberId,
        original_full_name: rec.fullName,
        original_email: rec.email,
        original_agency_name: rec.agencyName,
        original_market_name: rec.marketName || null,
        delivery_status: 'PENDING'
      }));

      const { error: recError } = await supabase.from('quote_recipients').insert(recipientInserts);
      if (recError) {
        console.warn('Warning: Could not snapshot quote recipients:', recError.message);
      }
    }

    // 3. Insert frozen line items snapshot
    if (payload.items.length > 0) {
      const itemInserts = payload.items.map((item) => ({
        quote_id: quote.id,
        hotel_id: item.hotel_id,
        season_id: item.season_id,
        contract_id: item.contract_id || null,
        contract_version_id: item.contract_version_id || null,
        contract_reference_snapshot: item.contract_reference_snapshot || null,
        rate_sheet_id: item.rate_sheet_id || null,
        hotel_name_snapshot: item.hotel_name_snapshot,
        season_label_snapshot: item.season_label_snapshot,
        room_type_snapshot: item.room_type_snapshot,
        meal_plan_snapshot: item.meal_plan_snapshot,
        rate_category: item.rate_category,
        quoted_amount: item.quoted_amount,
        currency: item.currency,
        custom_notes: item.custom_notes || null
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(itemInserts);
      if (itemsError) {
        console.warn('Warning: Could not snapshot quote line items:', itemsError.message);
      }
    }

    return quote as QuoteRecord;
  },

  /**
   * Fetch quotes filtered by specific agency or member for previous rate history
   */
  async getQuotesForAgencyOrMember(agencyId?: string, memberId?: string): Promise<QuoteRecord[]> {
    const all = await this.getQuotes();
    return all.filter((q) => {
      if (agencyId && q.agency_id !== agencyId) return false;
      if (memberId && q.quote_recipients && !q.quote_recipients.some((r) => r.original_member_id === memberId)) {
        return false;
      }
      return true;
    });
  },

  /**
   * Fetch recent quote history with recipient snapshots
   */
  async getQuotes(): Promise<QuoteRecord[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        travel_agencies (name),
        user_profiles:sender_id (full_name),
        quote_recipients (*),
        quote_items (*),
        quote_email_attempts (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not fetch quotes list:', error.message);
      return [];
    }

    return ((data || []) as unknown as QuoteDbRow[]).map((row) => ({
      ...row,
      agency_name: row.travel_agencies?.name || 'Unknown Agency',
      sender_name: row.user_profiles?.full_name || 'Staff User',
      confirmer_name: row.confirmer_profile?.full_name || undefined,
      recipients_count: row.quote_recipients ? row.quote_recipients.length : 0
    }));
  },

  /**
   * Record that a quote was opened in the user's local/device email application (mailto handoff)
   * Does NOT mark as SENT, but preserves the action timestamp and changes status to OPENED_IN_EMAIL_APP
   */
  async recordOpenedInEmailApp(quoteId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          email_status: 'OPENED_IN_EMAIL_APP',
          opened_in_app_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) {
        console.warn('Could not record opened_in_app_at:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Failed to update email_status to OPENED_IN_EMAIL_APP:', err);
      return false;
    }
  },

  /**
   * User confirmation of manual sending inside their device/local email client
   */
  async recordUserSendConfirmation(
    quoteId: string,
    userId: string,
    confirmedSent: boolean,
    notes?: string
  ): Promise<{ success: boolean; status: 'USER_CONFIRMED_SENT' | 'OPENED_IN_EMAIL_APP' | 'NOT_SENT'; error?: string }> {
    try {
      if (confirmedSent) {
        const { error } = await supabase
          .from('quotes')
          .update({
            email_status: 'USER_CONFIRMED_SENT',
            confirmed_by: userId,
            confirmed_at: new Date().toISOString(),
            confirmation_notes: notes || 'Confirmed sent manually by staff member in device email client',
            quote_lifecycle: 'DISPATCHED'
          })
          .eq('id', quoteId);

        if (error) {
          return { success: false, status: 'OPENED_IN_EMAIL_APP', error: error.message };
        }
        return { success: true, status: 'USER_CONFIRMED_SENT' };
      } else {
        // Staff clicked "Not Sent Yet"
        const { error } = await supabase
          .from('quotes')
          .update({
            email_status: 'OPENED_IN_EMAIL_APP',
            confirmation_notes: notes || 'Staff indicated quote was not yet sent in email client.'
          })
          .eq('id', quoteId);

        if (error) {
          return { success: false, status: 'OPENED_IN_EMAIL_APP', error: error.message };
        }
        return { success: true, status: 'OPENED_IN_EMAIL_APP' };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, status: 'OPENED_IN_EMAIL_APP', error: msg };
    }
  },

  /**
   * Trigger secure server-side email dispatch via Supabase Edge Function
   */
  async dispatchQuoteEmail(quoteId: string): Promise<{
    success: boolean;
    email_status: 'SENT' | 'FAILED' | 'QUEUED' | 'NOT_SENT';
    error?: string;
    message?: string;
  }> {
    // 1. Fetch current quote state to check duplicate sending
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('email_status')
      .eq('id', quoteId)
      .single();

    if (quoteError) {
      return { success: false, email_status: 'FAILED', error: quoteError.message };
    }

    if (quote?.email_status === 'SENT') {
      return {
        success: false,
        email_status: 'SENT',
        error: 'Duplicate sending prevented: This quote email has already been dispatched.'
      };
    }

    // 2. Mark state transition to PENDING (lifecycle tracking: DRAFT -> PENDING)
    await supabase
      .from('quotes')
      .update({ email_status: 'QUEUED', quote_lifecycle: 'DISPATCHED' })
      .eq('id', quoteId);

    // 3. Call secure Supabase Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: { quote_id: quoteId }
      });

      if (error) {
        // Record failure attempt in audit table & update quote status to FAILED
        await supabase
          .from('quotes')
          .update({ email_status: 'FAILED' })
          .eq('id', quoteId);

        return {
          success: false,
          email_status: 'FAILED',
          error: error.message || 'Server Edge function error during dispatch'
        };
      }

      if (!data?.success) {
        // Provider unconfigured or dispatch error returned from function
        return {
          success: false,
          email_status: (data?.email_status as 'SENT' | 'FAILED' | 'QUEUED' | 'NOT_SENT') || 'FAILED',
          error: data?.error || 'Email dispatch failed'
        };
      }

      return {
        success: true,
        email_status: 'SENT',
        message: data.message || 'Email dispatched successfully'
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Fallback: If edge function endpoint is not reachable (e.g. unconfigured provider or local emulator not started),
      // transition safely to FAILED with meaningful explanation without claiming false success.
      await supabase
        .from('quotes')
        .update({ email_status: 'FAILED' })
        .eq('id', quoteId);

      return {
        success: false,
        email_status: 'FAILED',
        error: `Email server dispatch unreachable or provider unconfigured (${errMsg}). Preserved as FAILED for retry.`
      };
    }
  }
};
