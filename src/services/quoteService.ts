import { supabase } from '../lib/supabase';
import { SelectedRecipient } from '../components/rates/RecipientSelector';

export interface SavedQuoteItem {
  hotel_id: string;
  season_id: string;
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

export interface QuoteRecord {
  id: string;
  quote_reference: string;
  sender_id: string;
  agency_id: string;
  market_id?: string | null;
  recipient_scope: string;
  quote_lifecycle: 'DRAFT' | 'DISPATCHED' | 'CANCELLED';
  email_status: 'NOT_SENT' | 'QUEUED' | 'PARTIALLY_SENT' | 'SENT' | 'FAILED';
  email_subject: string;
  email_body_html: string;
  created_at: string;
  sent_at?: string | null;
  // Joins
  agency_name?: string;
  sender_name?: string;
  recipients_count?: number;
  quote_recipients?: QuoteRecipientSnapshot[];
  quote_items?: QuoteItemSnapshot[];
}

interface QuoteDbRow {
  id: string;
  quote_reference: string;
  sender_id: string;
  agency_id: string;
  market_id?: string | null;
  recipient_scope: string;
  quote_lifecycle: 'DRAFT' | 'DISPATCHED' | 'CANCELLED';
  email_status: 'NOT_SENT' | 'QUEUED' | 'PARTIALLY_SENT' | 'SENT' | 'FAILED';
  email_subject: string;
  email_body_html: string;
  created_at: string;
  sent_at?: string | null;
  travel_agencies?: { name: string } | null;
  user_profiles?: { full_name: string } | null;
  quote_recipients?: QuoteRecipientSnapshot[];
  quote_items?: QuoteItemSnapshot[];
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
        email_body_html: payload.email_body_html
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
        quote_items (*)
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
      recipients_count: row.quote_recipients ? row.quote_recipients.length : 0
    }));
  }
};
