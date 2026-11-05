-- ==============================================================================
-- WINDOW COMPANIES CRM — COMPREHENSIVE DOMAIN ROW LEVEL SECURITY (RLS)
-- Migration: 20261104000006_domain_rls_policies.sql
-- Enforces least-privilege default-deny RLS across all remaining 24 private tables.
-- ==============================================================================

-- 1. Enable RLS on all 24 domain tables
ALTER TABLE public.travel_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_special_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_email_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activity_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Travel Agencies, Markets & Members (Module 2)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS travel_agencies_select ON public.travel_agencies;
CREATE POLICY travel_agencies_select ON public.travel_agencies
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS travel_agencies_insert ON public.travel_agencies;
CREATE POLICY travel_agencies_insert ON public.travel_agencies
  FOR INSERT TO authenticated WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS travel_agencies_update ON public.travel_agencies;
CREATE POLICY travel_agencies_update ON public.travel_agencies
  FOR UPDATE TO authenticated USING (public.is_active_employee()) WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS travel_agencies_delete ON public.travel_agencies;
CREATE POLICY travel_agencies_delete ON public.travel_agencies
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS agency_markets_select ON public.agency_markets;
CREATE POLICY agency_markets_select ON public.agency_markets
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS agency_markets_insert ON public.agency_markets;
CREATE POLICY agency_markets_insert ON public.agency_markets
  FOR INSERT TO authenticated WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS agency_markets_update ON public.agency_markets;
CREATE POLICY agency_markets_update ON public.agency_markets
  FOR UPDATE TO authenticated USING (public.is_active_employee()) WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS agency_markets_delete ON public.agency_markets;
CREATE POLICY agency_markets_delete ON public.agency_markets
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS agency_members_select ON public.agency_members;
CREATE POLICY agency_members_select ON public.agency_members
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS agency_members_insert ON public.agency_members;
CREATE POLICY agency_members_insert ON public.agency_members
  FOR INSERT TO authenticated WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS agency_members_update ON public.agency_members;
CREATE POLICY agency_members_update ON public.agency_members
  FOR UPDATE TO authenticated USING (public.is_active_employee()) WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS agency_members_delete ON public.agency_members;
CREATE POLICY agency_members_delete ON public.agency_members
  FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Hotels & Hotel Seasons (Module 3)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS hotels_select ON public.hotels;
CREATE POLICY hotels_select ON public.hotels
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS hotels_modify_admin ON public.hotels;
CREATE POLICY hotels_modify_admin ON public.hotels
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS hotel_seasons_select ON public.hotel_seasons;
CREATE POLICY hotel_seasons_select ON public.hotel_seasons
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS hotel_seasons_modify_rates ON public.hotel_seasons;
CREATE POLICY hotel_seasons_modify_rates ON public.hotel_seasons
  FOR ALL TO authenticated USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates());

-- ------------------------------------------------------------------------------
-- 4. Rates & Special Rates (Module 4)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS rate_sheets_select ON public.hotel_rate_sheets;
CREATE POLICY rate_sheets_select ON public.hotel_rate_sheets
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS rate_sheets_modify ON public.hotel_rate_sheets;
CREATE POLICY rate_sheets_modify ON public.hotel_rate_sheets
  FOR ALL TO authenticated USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates());

DROP POLICY IF EXISTS rate_components_select ON public.hotel_rate_components;
CREATE POLICY rate_components_select ON public.hotel_rate_components
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS rate_components_modify ON public.hotel_rate_components;
CREATE POLICY rate_components_modify ON public.hotel_rate_components
  FOR ALL TO authenticated USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates());

DROP POLICY IF EXISTS rate_outputs_select ON public.hotel_rate_outputs;
CREATE POLICY rate_outputs_select ON public.hotel_rate_outputs
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS rate_outputs_modify ON public.hotel_rate_outputs;
CREATE POLICY rate_outputs_modify ON public.hotel_rate_outputs
  FOR ALL TO authenticated USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates());

DROP POLICY IF EXISTS special_rates_select ON public.agency_special_rates;
CREATE POLICY special_rates_select ON public.agency_special_rates
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS special_rates_modify ON public.agency_special_rates;
CREATE POLICY special_rates_modify ON public.agency_special_rates
  FOR ALL TO authenticated USING (public.can_manage_rates()) WITH CHECK (public.can_manage_rates());

-- ------------------------------------------------------------------------------
-- 5. Quotations & Recipients (Module 5)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS quotes_select ON public.quotes;
CREATE POLICY quotes_select ON public.quotes
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS quotes_insert ON public.quotes;
CREATE POLICY quotes_insert ON public.quotes
  FOR INSERT TO authenticated WITH CHECK (public.is_active_employee() AND sender_id = auth.uid());

DROP POLICY IF EXISTS quotes_update ON public.quotes;
CREATE POLICY quotes_update ON public.quotes
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.is_active_employee() AND sender_id = auth.uid()))
  WITH CHECK (public.is_admin() OR (public.is_active_employee() AND sender_id = auth.uid()));

DROP POLICY IF EXISTS quotes_delete ON public.quotes;
CREATE POLICY quotes_delete ON public.quotes
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS quote_recipients_select ON public.quote_recipients;
CREATE POLICY quote_recipients_select ON public.quote_recipients
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS quote_recipients_modify ON public.quote_recipients;
CREATE POLICY quote_recipients_modify ON public.quote_recipients
  FOR ALL TO authenticated USING (public.is_active_employee()) WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS quote_items_select ON public.quote_items;
CREATE POLICY quote_items_select ON public.quote_items
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS quote_items_modify ON public.quote_items;
CREATE POLICY quote_items_modify ON public.quote_items
  FOR ALL TO authenticated USING (public.is_active_employee()) WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS quote_attempts_select ON public.quote_email_attempts;
CREATE POLICY quote_attempts_select ON public.quote_email_attempts
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS quote_attempts_insert ON public.quote_email_attempts;
CREATE POLICY quote_attempts_insert ON public.quote_email_attempts
  FOR INSERT TO authenticated WITH CHECK (public.is_active_employee());

-- ------------------------------------------------------------------------------
-- 6. Sales Team Memberships & Notifications (Module 6)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS team_memberships_select ON public.sales_team_memberships;
CREATE POLICY team_memberships_select ON public.sales_team_memberships
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS team_memberships_modify ON public.sales_team_memberships;
CREATE POLICY team_memberships_modify ON public.sales_team_memberships
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated USING (public.is_active_employee() AND user_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. Sales Activities & Attachments (Module 7)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS sales_activities_select ON public.sales_activities;
CREATE POLICY sales_activities_select ON public.sales_activities
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS sales_activities_insert ON public.sales_activities;
CREATE POLICY sales_activities_insert ON public.sales_activities
  FOR INSERT TO authenticated WITH CHECK (public.is_active_employee() AND staff_id = auth.uid());

DROP POLICY IF EXISTS sales_activities_update ON public.sales_activities;
CREATE POLICY sales_activities_update ON public.sales_activities
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.is_active_employee() AND staff_id = auth.uid()))
  WITH CHECK (public.is_admin() OR (public.is_active_employee() AND staff_id = auth.uid()));

DROP POLICY IF EXISTS sales_activities_delete ON public.sales_activities;
CREATE POLICY sales_activities_delete ON public.sales_activities
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS activity_attachments_select ON public.sales_activity_attachments;
CREATE POLICY activity_attachments_select ON public.sales_activity_attachments
  FOR SELECT TO authenticated USING (public.is_active_employee());

DROP POLICY IF EXISTS activity_attachments_insert ON public.sales_activity_attachments;
CREATE POLICY activity_attachments_insert ON public.sales_activity_attachments
  FOR INSERT TO authenticated WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS activity_attachments_delete ON public.sales_activity_attachments;
CREATE POLICY activity_attachments_delete ON public.sales_activity_attachments
  FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Team Chat System (Module 8)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS chat_groups_select ON public.chat_groups;
CREATE POLICY chat_groups_select ON public.chat_groups
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS chat_groups_insert ON public.chat_groups;
CREATE POLICY chat_groups_insert ON public.chat_groups
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND permission_key = 'CAN_CREATE_CHAT_GROUPS')
  );

DROP POLICY IF EXISTS chat_groups_update ON public.chat_groups;
CREATE POLICY chat_groups_update ON public.chat_groups
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid())
  WITH CHECK (public.is_admin() OR created_by = auth.uid());

DROP POLICY IF EXISTS chat_group_members_select ON public.chat_group_members;
CREATE POLICY chat_group_members_select ON public.chat_group_members
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.chat_group_members m WHERE m.group_id = chat_group_members.group_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS chat_group_members_modify ON public.chat_group_members;
CREATE POLICY chat_group_members_modify ON public.chat_group_members
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.chat_groups g WHERE g.id = chat_group_members.group_id AND g.created_by = auth.uid())
  );

DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = chat_messages.group_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND 
    (public.is_admin() OR EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = chat_messages.group_id AND user_id = auth.uid()))
  );

DROP POLICY IF EXISTS chat_message_attachments_select ON public.chat_message_attachments;
CREATE POLICY chat_message_attachments_select ON public.chat_message_attachments
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.chat_messages m 
      JOIN public.chat_group_members gm ON gm.group_id = m.group_id 
      WHERE m.id = message_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_mentions_select ON public.chat_message_mentions;
CREATE POLICY chat_mentions_select ON public.chat_message_mentions
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.chat_messages m 
      JOIN public.chat_group_members gm ON gm.group_id = m.group_id 
      WHERE m.id = message_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_receipts_select ON public.chat_read_receipts;
CREATE POLICY chat_receipts_select ON public.chat_read_receipts
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.chat_group_members gm 
      WHERE gm.group_id = chat_read_receipts.group_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_receipts_modify ON public.chat_read_receipts;
CREATE POLICY chat_receipts_modify ON public.chat_read_receipts
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 9. Audit Logs (Module 9 - Immutable Append-Only)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS audit_logs_insert_system ON public.audit_logs;
CREATE POLICY audit_logs_insert_system ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE and DELETE policies are intentionally omitted for audit_logs (append-only)
