-- ==============================================================================
-- WINDOW COMPANIES CRM — INITIAL POSTGRESQL DRAFT SCHEMA (PHASE 2A REVISED)
-- ==============================================================================
-- Document Version: 1.1.0 (REVISED DRAFT / ARCHITECTURAL DESIGN ONLY)
-- Status Date: November 02, 2026
-- Classification: Internal Technical Schema
-- Primary Source of Truth: WINDOW_COMPANIES_CRM_COMPLETE_PROJECT_HANDOVER.md
--
-- STRICT PHASE 2A BOUNDARY NOTICE:
-- 1. THIS SQL SCRIPT IS A DESIGN SPECIFICATION ONLY.
-- 2. DO NOT EXECUTE THIS SCRIPT AGAINST A LIVE SUPABASE INSTANCE IN PHASE 2A.
-- 3. NO LIVE DATABASE CONNECTION OR MIGRATION HAS BEEN PERFORMED.
-- 4. ALL POLICIES, TRIGGERS, AND CONSTRAINTS ARE PREPARED IN DEPENDENCY ORDER.
-- ==============================================================================

-- Enable standard UUID generation and text search extensions (Design requirement)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==============================================================================
-- MODULE 1: EMPLOYEES & SYSTEM ACCESS (INTERNAL STAFF ONLY)
-- ==============================================================================

-- Table 1: user_profiles
-- Extends Supabase auth.users for company personnel (5 - 15 staff members).
-- Agency members / external contacts DO NOT receive records here.
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STAFF',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_user_profile_name_len CHECK (char_length(full_name) >= 2),
    CONSTRAINT chk_user_profile_role CHECK (role IN ('ADMIN', 'STAFF'))
);

COMMENT ON TABLE public.user_profiles IS 'Internal CRM employee profiles. Agency contacts do not login and are stored separately in agency_members.';

-- Table 2: user_permissions
-- Isolates granular capabilities granted by Admin, such as can_manage_rates.
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    permission_key VARCHAR(50) NOT NULL,
    granted_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_user_permission UNIQUE (user_id, permission_key),
    CONSTRAINT chk_permission_key CHECK (permission_key IN ('CAN_MANAGE_RATES', 'CAN_MANAGE_USERS', 'CAN_CREATE_CHAT_GROUPS'))
);

COMMENT ON TABLE public.user_permissions IS 'Granular capabilities assigned by Admin. Controls access to protected hotel rate configuration.';

-- ==============================================================================
-- MODULE 2: TRAVEL AGENCY HIERARCHY
-- ==============================================================================

-- Table 3: travel_agencies
-- Parent travel agency profiles (e.g. Jetwing Travels).
CREATE TABLE IF NOT EXISTS public.travel_agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_agency_name UNIQUE (name),
    CONSTRAINT chk_agency_name_len CHECK (char_length(name) >= 2),
    CONSTRAINT chk_agency_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

COMMENT ON TABLE public.travel_agencies IS 'Master travel agencies. Serves as top-level parent entity in contact hierarchy.';

-- Table 4: agency_markets
-- Regional market desks (e.g. Indian Market, Europe Market) partitioned per agency.
CREATE TABLE IF NOT EXISTS public.agency_markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.travel_agencies(id) ON DELETE RESTRICT,
    market_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_agency_market UNIQUE (agency_id, market_name),
    -- Composite unique key to support composite FK referential integrity:
    CONSTRAINT uq_agency_market_composite UNIQUE (id, agency_id),
    CONSTRAINT chk_market_name_len CHECK (char_length(market_name) >= 2)
);

COMMENT ON TABLE public.agency_markets IS 'Market desks belonging to a specific agency. Market names may repeat under different agencies.';

-- Table 5: agency_members
-- Internal contact profiles for agency personnel (~1,000 contacts; e.g. Sarith, Jana, Priya).
-- Composite FK enforces that market_id strictly belongs to agency_id.
CREATE TABLE IF NOT EXISTS public.agency_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL,
    market_id UUID NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    position VARCHAR(100),
    member_code VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Standard Foreign Key to travel_agencies
    CONSTRAINT fk_agency_members_agency FOREIGN KEY (agency_id) REFERENCES public.travel_agencies(id) ON DELETE RESTRICT,
    -- Composite Foreign Key strictly enforcing that market belongs to the specified agency:
    CONSTRAINT fk_agency_members_composite_market FOREIGN KEY (market_id, agency_id) REFERENCES public.agency_markets(id, agency_id) ON DELETE RESTRICT,
    -- Composite Unique constraint to support downstream composite references:
    CONSTRAINT uq_agency_member_composite UNIQUE (id, agency_id),
    CONSTRAINT chk_member_name_len CHECK (char_length(full_name) >= 2),
    CONSTRAINT chk_member_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_member_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

COMMENT ON TABLE public.agency_members IS 'Contact profiles for agency personnel. Composite FK guarantees market belongs to agency.';

-- Deduplication index for contact searches
CREATE INDEX IF NOT EXISTS idx_agency_members_lower_email ON public.agency_members (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_agency_members_agency_market ON public.agency_members (agency_id, market_id);

-- ==============================================================================
-- MODULE 3: HOTELS & SEASONAL CALENDAR
-- ==============================================================================

-- Table 6: hotels
-- Partner hotel inventory (Randoli, Beragala, Horton Heights, H.S.H.).
CREATE TABLE IF NOT EXISTS public.hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_name VARCHAR(255) NOT NULL,
    hotel_code VARCHAR(50),
    area VARCHAR(100),
    service_type VARCHAR(20) NOT NULL DEFAULT 'BOTH',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_hotel_name UNIQUE (hotel_name),
    CONSTRAINT chk_hotel_name_len CHECK (char_length(hotel_name) >= 2),
    CONSTRAINT chk_hotel_service_type CHECK (service_type IN ('ONLINE', 'OFFLINE', 'BOTH')),
    CONSTRAINT chk_hotel_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

COMMENT ON TABLE public.hotels IS 'Partner hotels managed by Window Companies. Name of H.S.H. preserved as confirmed abbreviation.';

-- Table 7: hotel_seasons
-- Property-specific seasonal validity periods (e.g. 2026 Summer, 2026/27 Winter).
CREATE TABLE IF NOT EXISTS public.hotel_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
    season_label VARCHAR(100) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_hotel_season UNIQUE (hotel_id, season_label),
    -- Composite unique key to support composite FK referential integrity:
    CONSTRAINT uq_hotel_season_composite UNIQUE (id, hotel_id),
    CONSTRAINT chk_season_dates CHECK (date_to >= date_from),
    CONSTRAINT chk_season_status CHECK (status IN ('ACTIVE', 'UPCOMING', 'EXPIRED'))
);

COMMENT ON TABLE public.hotel_seasons IS 'Seasonal validity periods configured per hotel. Dates vary by property.';

-- ==============================================================================
-- MODULE 4: RATE ARCHITECTURE & SPECIAL RATES
-- ==============================================================================

-- Table 8: hotel_rate_sheets
-- Versioned rate schedules. Prevents overwriting previously published pricing.
-- Composite FK enforces that season_id strictly belongs to hotel_id.
CREATE TABLE IF NOT EXISTS public.hotel_rate_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL,
    season_id UUID NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    published_by UUID REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rate_sheets_hotel FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT,
    -- Composite Foreign Key strictly enforcing that season belongs to the specified hotel:
    CONSTRAINT fk_rate_sheets_composite_season FOREIGN KEY (season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT,
    -- Composite unique key supporting composite references:
    CONSTRAINT uq_hotel_rate_sheet_composite UNIQUE (id, hotel_id, season_id),
    CONSTRAINT uq_hotel_rate_sheet_version UNIQUE (hotel_id, season_id, version_number),
    CONSTRAINT chk_rate_sheet_version CHECK (version_number >= 1),
    CONSTRAINT chk_rate_sheet_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT chk_rate_sheet_currency CHECK (char_length(currency) = 3)
);

COMMENT ON TABLE public.hotel_rate_sheets IS 'Master versioned pricing schedules. Composite FK guarantees season belongs to hotel.';

-- Table 9: hotel_rate_components
-- Hotel-specific formula inputs (e.g. HB Double base, Single reduction, Triple supplement).
CREATE TABLE IF NOT EXISTS public.hotel_rate_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_sheet_id UUID NOT NULL REFERENCES public.hotel_rate_sheets(id) ON DELETE CASCADE,
    component_key VARCHAR(50) NOT NULL,
    component_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description VARCHAR(255),

    -- Prevent duplicate keys within the same rate sheet:
    CONSTRAINT uq_rate_sheet_component_key UNIQUE (rate_sheet_id, component_key),
    CONSTRAINT chk_component_key CHECK (char_length(component_key) >= 2)
);

COMMENT ON TABLE public.hotel_rate_components IS 'Configured calculation elements per hotel (HB base, reductions, supplements). Formulas unconfirmed.';

-- Table 10: hotel_rate_outputs
-- Pre-calculated or manually approved room prices by category tier (Red, Green, Yellow).
CREATE TABLE IF NOT EXISTS public.hotel_rate_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_sheet_id UUID NOT NULL REFERENCES public.hotel_rate_sheets(id) ON DELETE CASCADE,
    room_type VARCHAR(100) NOT NULL,
    meal_plan VARCHAR(20) NOT NULL,
    rate_category VARCHAR(20) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',

    CONSTRAINT uq_rate_sheet_output UNIQUE (rate_sheet_id, room_type, meal_plan, rate_category),
    CONSTRAINT chk_rate_output_category CHECK (rate_category IN ('RED', 'GREEN', 'YELLOW')),
    CONSTRAINT chk_rate_output_meal_plan CHECK (meal_plan IN ('RO', 'BB', 'HB', 'FB', 'AI')),
    CONSTRAINT chk_rate_output_amount CHECK (amount >= 0),
    CONSTRAINT chk_rate_output_currency CHECK (char_length(currency) = 3)
);

COMMENT ON TABLE public.hotel_rate_outputs IS 'Output rates mapped to confirmed tiers: Red (Lowest), Green (Normal), Yellow (Highest).';

-- Table 11: agency_special_rates
-- Agency-specific negotiated VIP rate slots 1, 2, and 3.
-- Composite FK enforces that season_id strictly belongs to hotel_id.
CREATE TABLE IF NOT EXISTS public.agency_special_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.travel_agencies(id) ON DELETE RESTRICT,
    hotel_id UUID NOT NULL,
    season_id UUID NOT NULL,
    slot_number INTEGER NOT NULL,
    room_type VARCHAR(100) NOT NULL DEFAULT 'Standard',
    meal_plan VARCHAR(20) NOT NULL DEFAULT 'HB',
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    date_in DATE NOT NULL,
    date_out DATE NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_special_rates_hotel FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT,
    -- Composite Foreign Key strictly enforcing that season belongs to the specified hotel:
    CONSTRAINT fk_special_rates_composite_season FOREIGN KEY (season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT,
    CONSTRAINT uq_agency_hotel_season_slot UNIQUE (agency_id, hotel_id, season_id, slot_number),
    CONSTRAINT chk_special_rate_slot CHECK (slot_number IN (1, 2, 3)),
    CONSTRAINT chk_special_rate_dates CHECK (date_out >= date_in),
    CONSTRAINT chk_special_rate_amount CHECK (amount >= 0),
    CONSTRAINT chk_special_rate_currency CHECK (char_length(currency) = 3)
);

COMMENT ON TABLE public.agency_special_rates IS 'Negotiated special rates strictly tied to an agency. Exactly 3 slots (1, 2, 3). No admin pre-approval needed.';

-- ==============================================================================
-- MODULE 5: IMMUTABLE QUOTE SNAPSHOTS & DISTRIBUTION
-- ==============================================================================

-- Table 12: quotes
-- Master quote record dispatched by email to travel agency contacts.
-- If market_id is provided, composite FK enforces it belongs to agency_id.
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_reference VARCHAR(50) NOT NULL,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    agency_id UUID NOT NULL REFERENCES public.travel_agencies(id) ON DELETE RESTRICT,
    market_id UUID,
    recipient_scope VARCHAR(20) NOT NULL,
    quote_lifecycle VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    email_status VARCHAR(20) NOT NULL DEFAULT 'NOT_SENT',
    email_subject VARCHAR(255) NOT NULL,
    email_body_html TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ,

    -- Composite FK ensuring selected market desk belongs to recipient agency:
    CONSTRAINT fk_quotes_composite_market FOREIGN KEY (market_id, agency_id) REFERENCES public.agency_markets(id, agency_id) ON DELETE RESTRICT,
    -- Composite Unique constraint to support downstream integrity checks:
    CONSTRAINT uq_quotes_composite UNIQUE (id, agency_id),
    CONSTRAINT uq_quote_reference UNIQUE (quote_reference),
    CONSTRAINT chk_quote_reference_len CHECK (char_length(quote_reference) >= 6),
    CONSTRAINT chk_recipient_scope CHECK (recipient_scope IN ('INDIVIDUAL', 'ENTIRE_MARKET', 'ENTIRE_AGENCY')),
    CONSTRAINT chk_quote_lifecycle CHECK (quote_lifecycle IN ('DRAFT', 'DISPATCHED', 'CANCELLED')),
    CONSTRAINT chk_quote_email_status CHECK (email_status IN ('NOT_SENT', 'QUEUED', 'PARTIALLY_SENT', 'SENT', 'FAILED'))
);

COMMENT ON TABLE public.quotes IS 'Immutable quote header. Lifecycle separated from individual recipient email delivery attempts.';

-- Table 13: quote_recipients
-- Frozen snapshot of recipients at send time. Survives contact modifications.
-- If original_member_id is present, it is validated against the quote agency.
CREATE TABLE IF NOT EXISTS public.quote_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    original_member_id UUID REFERENCES public.agency_members(id) ON DELETE SET NULL,
    original_full_name VARCHAR(255) NOT NULL,
    original_email VARCHAR(255) NOT NULL,
    original_agency_name VARCHAR(255) NOT NULL,
    original_market_name VARCHAR(100),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    error_message TEXT,

    CONSTRAINT chk_recipient_delivery_status CHECK (delivery_status IN ('PENDING', 'SENT', 'FAILED'))
);

COMMENT ON TABLE public.quote_recipients IS 'Frozen snapshot of recipient names and email addresses with per-recipient delivery status.';

-- Table 14: quote_items
-- Frozen snapshot of quoted hotel room line items, tiers, and prices.
-- Composite FK enforces that season_id strictly belongs to hotel_id.
CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL,
    season_id UUID NOT NULL,
    rate_sheet_id UUID REFERENCES public.hotel_rate_sheets(id) ON DELETE RESTRICT,
    rate_sheet_version_snapshot INTEGER,
    hotel_name_snapshot VARCHAR(255) NOT NULL,
    season_label_snapshot VARCHAR(100) NOT NULL,
    room_type_snapshot VARCHAR(100) NOT NULL,
    meal_plan_snapshot VARCHAR(20) NOT NULL,
    rate_category VARCHAR(20) NOT NULL,
    quoted_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    custom_notes TEXT,

    CONSTRAINT fk_quote_items_hotel FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT,
    -- Composite Foreign Key strictly enforcing that season belongs to the specified hotel:
    CONSTRAINT fk_quote_items_composite_season FOREIGN KEY (season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT,
    CONSTRAINT chk_quote_item_category CHECK (rate_category IN ('RED', 'GREEN', 'YELLOW', 'SPECIAL_1', 'SPECIAL_2', 'SPECIAL_3', 'CUSTOM')),
    CONSTRAINT chk_quote_item_amount CHECK (quoted_amount >= 0),
    CONSTRAINT chk_quote_item_currency CHECK (char_length(currency) = 3)
);

COMMENT ON TABLE public.quote_items IS 'Frozen room line items. Preserves historical quoted prices even if live hotel rates change later.';

-- Table 15: quote_email_attempts
-- Audit log of email dispatch attempts per recipient.
CREATE TABLE IF NOT EXISTS public.quote_email_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.quote_recipients(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    delivery_status VARCHAR(20) NOT NULL,
    provider_message_id VARCHAR(255),
    error_message TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_attempt_status CHECK (delivery_status IN ('SENDING', 'SENT', 'FAILED')),
    CONSTRAINT chk_attempt_number CHECK (attempt_number >= 1)
);

COMMENT ON TABLE public.quote_email_attempts IS 'Server-side dispatch attempts linked to specific recipients for multi-recipient traceability.';

-- ==============================================================================
-- MODULE 6: INTERNAL SALES TEAM NOTIFICATIONS
-- ==============================================================================

-- Table 16: sales_team_memberships
-- Fixed roster of internal company staff enrolled in the Sales Team broadcast group.
CREATE TABLE IF NOT EXISTS public.sales_team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_sales_team_user UNIQUE (user_id)
);

COMMENT ON TABLE public.sales_team_memberships IS 'Roster for fixed Sales Team group. Senders do not choose recipients each time.';

-- Table 17: notifications
-- In-app alert queue for quote distributions, chat mentions, and system updates.
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_notification_event CHECK (event_type IN ('QUOTE_SHARED', 'CHAT_MENTION', 'SPECIAL_RATE_CREATED', 'SYSTEM_ALERT'))
);

COMMENT ON TABLE public.notifications IS 'Internal alert feed. Notification delivery failure must not abort or delete quotes.';

-- ==============================================================================
-- MODULE 7: SALES ACTIVITIES & VOICE RECORDINGS
-- ==============================================================================

-- Table 18: sales_activities
-- Logs sales phone calls, meetings, and discussions. Activity is NOT a booking receipt.
-- Composite FK enforces that market and member strictly belong to agency_id.
CREATE TABLE IF NOT EXISTS public.sales_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    agency_id UUID NOT NULL REFERENCES public.travel_agencies(id) ON DELETE RESTRICT,
    market_id UUID,
    member_id UUID,
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE RESTRICT,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_type VARCHAR(50) NOT NULL DEFAULT 'PHONE_CALL',
    notes TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Composite FK enforcing market belongs to the activity agency:
    CONSTRAINT fk_sales_activities_composite_market FOREIGN KEY (market_id, agency_id) REFERENCES public.agency_markets(id, agency_id) ON DELETE RESTRICT,
    -- Composite FK enforcing contact member belongs to the activity agency:
    CONSTRAINT fk_sales_activities_composite_member FOREIGN KEY (member_id, agency_id) REFERENCES public.agency_members(id, agency_id) ON DELETE RESTRICT,
    CONSTRAINT chk_activity_type CHECK (activity_type IN ('PHONE_CALL', 'MEETING', 'EMAIL_DISCUSSION', 'VOICE_NOTE', 'OTHER'))
);

COMMENT ON TABLE public.sales_activities IS 'Sales interaction logs. Composite FKs guarantee market and member belong to specified agency.';

-- Table 19: sales_activity_attachments
-- Stores private storage references for voice recordings. Bytes stored in Supabase Storage.
CREATE TABLE IF NOT EXISTS public.sales_activity_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.sales_activities(id) ON DELETE CASCADE,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'private-audio',
    storage_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    transcription_language VARCHAR(20),
    transcription_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_audio_mime CHECK (mime_type IN ('audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav')),
    CONSTRAINT chk_audio_size CHECK (file_size_bytes <= 15728640) -- Cap 15MB
);

COMMENT ON TABLE public.sales_activity_attachments IS 'Metadata and private storage references for voice recordings. Large binaries kept off database rows.';

-- ==============================================================================
-- MODULE 8: INTERNAL TEAM CHAT (ADMIN-CREATED GROUPS ONLY)
-- ==============================================================================

-- Table 20: chat_groups
-- Internal messaging channels. ONLY Admins can create chat groups.
CREATE TABLE IF NOT EXISTS public.chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_chat_group_name_len CHECK (char_length(name) >= 2)
);

COMMENT ON TABLE public.chat_groups IS 'Internal team chat groups. Confirmed decision: Only Admins can create chat groups.';

-- Table 21: chat_group_members
-- Roster of enrolled employees in chat channels.
CREATE TABLE IF NOT EXISTS public.chat_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_chat_group_member UNIQUE (group_id, user_id),
    -- Composite unique key to support composite FK referential integrity:
    CONSTRAINT uq_chat_group_member_composite UNIQUE (group_id, user_id)
);

COMMENT ON TABLE public.chat_group_members IS 'Group channel enrollment roster. Users can only query messages for groups they belong to.';

-- Table 22: chat_messages
-- Real-time chat messages stream.
-- Composite FK strictly enforces that sender_id is an enrolled member of group_id.
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    message_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_messages_group FOREIGN KEY (group_id) REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    -- Composite Foreign Key enforcing sender must be an enrolled group member:
    CONSTRAINT fk_chat_messages_composite_member FOREIGN KEY (group_id, sender_id) REFERENCES public.chat_group_members(group_id, user_id) ON DELETE CASCADE,
    -- Composite unique key supporting composite references:
    CONSTRAINT uq_chat_messages_composite UNIQUE (id, group_id),
    CONSTRAINT chk_chat_message_type CHECK (message_type IN ('TEXT', 'IMAGE', 'AUDIO', 'SYSTEM'))
);

COMMENT ON TABLE public.chat_messages IS 'Message stream. Composite FK guarantees sender is an enrolled member of the group.';

-- Table 23: chat_message_attachments
-- Image and voice note storage metadata for chat.
CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'private-chat',
    storage_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_chat_attachment_size CHECK (file_size_bytes <= 26214400) -- Cap 25MB
);

COMMENT ON TABLE public.chat_message_attachments IS 'Storage object references for images and audio files shared in internal chat.';

-- Table 24: chat_message_mentions
-- Tracks @name employee mentions in chat messages for push/in-app notifications.
CREATE TABLE IF NOT EXISTS public.chat_message_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_chat_mention UNIQUE (message_id, mentioned_user_id)
);

COMMENT ON TABLE public.chat_message_mentions IS 'Explicit @user mention tags triggering in-app and mobile alerts.';

-- Table 25: chat_read_receipts
-- Per-user read cursors for unread counters in chat list.
-- Composite FK enforces user_id is an enrolled group member.
CREATE TABLE IF NOT EXISTS public.chat_read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    last_read_message_id UUID,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_read_receipts_group FOREIGN KEY (group_id) REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_read_receipts_user FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    -- Composite FK enforcing user must belong to group:
    CONSTRAINT fk_chat_read_receipts_composite_member FOREIGN KEY (group_id, user_id) REFERENCES public.chat_group_members(group_id, user_id) ON DELETE CASCADE,
    -- Composite FK enforcing last_read_message belongs to the same group:
    CONSTRAINT fk_chat_read_receipts_composite_msg FOREIGN KEY (last_read_message_id, group_id) REFERENCES public.chat_messages(id, group_id) ON DELETE SET NULL,
    CONSTRAINT uq_chat_read_receipt UNIQUE (group_id, user_id)
);

COMMENT ON TABLE public.chat_read_receipts IS 'Per-user read status cursors. Composite FK guarantees message belongs to group.';

-- ==============================================================================
-- MODULE 9: AUDIT LOGS & SYSTEM INTEGRITY
-- ==============================================================================

-- Table 26: audit_logs
-- Immutable system audit log. Captures administrative, role, and rate adjustments.
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_audit_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'PUBLISH', 'GRANT', 'REVOKE'))
);

COMMENT ON TABLE public.audit_logs IS 'Immutable system audit log. Passwords, auth tokens, and service keys are strictly excluded.';

-- ==============================================================================
-- QUERY PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_rate_sheets_lookup ON public.hotel_rate_sheets (hotel_id, season_id, status);
CREATE INDEX IF NOT EXISTS idx_rate_outputs_lookup ON public.hotel_rate_outputs (rate_sheet_id, rate_category);
CREATE INDEX IF NOT EXISTS idx_agency_special_rates_lookup ON public.agency_special_rates (agency_id, hotel_id, season_id);
CREATE INDEX IF NOT EXISTS idx_quotes_agency ON public.quotes (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_sender ON public.quotes (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_recipients_email ON public.quote_recipients (LOWER(original_email));
CREATE INDEX IF NOT EXISTS idx_quote_recipients_member ON public.quote_recipients (original_member_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created ON public.chat_messages (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs (target_table, target_record_id, timestamp DESC);

-- ==============================================================================
-- END OF REVISED DRAFT SCHEMA (PHASE 2A)
-- ==============================================================================
