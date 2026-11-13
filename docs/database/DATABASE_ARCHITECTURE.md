# WINDOW COMPANIES CRM — DATABASE ARCHITECTURE SPECIFICATION (PHASE 2A REVISED)

**Document Version:** 1.1.0 (Architecture Blueprint — Revised)  
**Status Date:** November 02, 2026  
**Classification:** Internal Confidential — Architectural Blueprint  
**Primary Source of Truth:** `WINDOW_COMPANIES_CRM_COMPLETE_PROJECT_HANDOVER.md`  
**Phase State:** Phase 2A — Architecture & Schema Design Only (No live DB / No migrations)

---

## 1. Executive Summary & Domain Overview

WINDOW COMPANIES CRM is an internal operational platform for **Window Companies (Pvt) Ltd**, a sales and marketing firm representing partner hotels and distributing rates to travel agencies and destination management companies (DMCs).

The core business process requires sales personnel to:
1. Maintain partner hotels, seasonal periods, and confidential pricing schedules.
2. Manage a structured hierarchy of client travel agencies, regional market desks, and contact profiles.
3. Rapidly look up, negotiate, and quote hotel rates using confirmed pricing categories:
   - **RED:** Lowest Rate
   - **GREEN:** Normal Rate
   - **YELLOW:** Highest Rate
   - **SPECIAL 1, 2, 3:** Agency-specific negotiated slots
   - **CUSTOM:** Salesperson-specified price (subject to validation)
4. Distribute selected rates by email (with rate details embedded directly in the email body, omitting internal color codes and cost margins).
5. Persist an **immutable snapshot** of every quote sent.
6. Automatically broadcast quote dispatch alerts to a fixed internal **Sales Team** group.
7. Record phone calls, discussions, and voice recordings as **Sales Activities** (not booking receipts).
8. Provide real-time internal team communication (text, voice notes, media) within Admin-created channels.
9. Deliver business intelligence analytics without exposing raw transactional records.

---

## 2. Core Architectural Decisions

### 2.1 Distinction Between Employee Accounts and Agency Contacts
A fundamental security boundary exists between:
- **Internal Employees (Users):** Company personnel (approximately 5 to 15 staff members) who authenticate into the CRM via Supabase Auth (`auth.users`). Their operational identity, roles (`ADMIN` or `STAFF`), and granted capabilities are stored in `public.user_profiles` and `public.user_permissions`.
- **Agency Members (Contacts):** External personnel working for travel agencies (e.g., Sarith, Jana, Priya). **Agency members do NOT receive login accounts, passwords, or direct database access.** They exist exclusively as CRM contact records (`public.agency_members`).

### 2.2 Relational Contact Hierarchy & Composite Integrity
The CRM strictly models the company's real-world relationship structure:
```
Travel Agency (e.g., Jetwing Travels)
   └── Agency Markets (e.g., Indian Market, Europe Market, Belgium Market)
         └── Agency Members / Contacts (e.g., Sarith, Jana)
```
- A market belongs strictly to one travel agency. Market names (such as "Indian Market") are not globally unique and may appear under multiple distinct agencies.
- To prevent relational mismatch bugs (such as assigning a member to Agency A while selecting a market desk belonging to Agency B), the database enforces a **composite foreign key**:
  ```sql
  CONSTRAINT fk_agency_members_composite_market 
  FOREIGN KEY (market_id, agency_id) REFERENCES public.agency_markets(id, agency_id)
  ```
- This guarantees that an agency member cannot reference an alien market desk.

### 2.3 Hotel Seasons, Rate Versioning & Composite Linkages
- Each partner hotel (e.g., Randoli, Beragala, Horton Heights, H.S.H.) maintains its own independent seasonal calendar (`hotel_seasons`), such as *2026 Summer* or *2026/27 Winter*. Date ranges vary by property.
- Pricing schedules (`hotel_rate_sheets`) belong to a specific hotel and season. A **composite foreign key** `(season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id)` guarantees a rate sheet cannot pair Hotel A with Hotel B's season.
- To prevent accidental rate tampering and preserve financial integrity, rate sheets implement **versioning** (`version_number` with statuses: `DRAFT`, `PUBLISHED`, `ARCHIVED`). 
- When monthly rate adjustments occur, a new rate sheet revision is created and published. The previous published version is archived, preventing silent overwrites.

### 2.4 Immutable Historical Quote Snapshots
A critical business and legal vulnerability in standard CRMs is displaying historical quotes by dynamically joining live hotel rate tables or live contact tables. If a hotel raises its room price 3 months later, or if a contact changes their email address, legacy quotes would display false numbers.

WINDOW COMPANIES CRM resolves this through an **immutable snapshot design**:
1. When a quote is created, a master record is written to `quotes` with lifecycle `DRAFT`.
2. When dispatched, `quotes.quote_lifecycle` transitions to `DISPATCHED`. Once dispatched, the snapshot is locked against further edits.
3. Every recipient's name, email, agency, and market at that exact instant are stored in `quote_recipients`.
4. Every hotel room line item, base price, currency, selected tier (Red/Green/Yellow/Special/Custom), and final quoted figure are frozen in `quote_items`.
5. Delivery attempts are tracked in `quote_email_attempts` linked directly to individual recipient records.

### 2.5 Agency-Specific Special Rates (Slots 1, 2, 3)
- Negotiated rates are strictly segregated by agency (`agency_special_rates`).
- Exactly 3 slots (`slot_number IN (1, 2, 3)`) are supported per agency/hotel/season combination via `UNIQUE (agency_id, hotel_id, season_id, slot_number)`.
- Admin pre-approval is **not** required to create special rates during active sales negotiations, but every record audits the creator staff ID, timestamp, validity dates (`date_in`, `date_out`), and commercial justification note.
- Composite foreign keys guarantee that the season belongs strictly to the selected hotel.

### 2.6 Server-Side Operations & Storage Strategy
- **Email Dispatch:** Handled via server-side Edge Functions. The database records dispatch state in `quote_email_attempts` (`CREATED`, `SENDING`, `SENT`, `FAILED`). A failed delivery is never marked as sent.
- **Audio & Media Attachments:** Raw audio bytes (voice notes) and chat images are **never** stored inside PostgreSQL table columns. They are uploaded to private Supabase Storage buckets, and only their UUIDs, storage paths, file sizes, and MIME types are stored in `sales_activity_attachments` and `chat_message_attachments`.

---

## 3. System Modules & Proposed Tables (Exactly 26 Tables across 9 Modules)

The schema comprises exactly **26 normalized tables** organized into **9 logical modules**:

```
[Module 1: Employees & System Access]
  ├── user_profiles (Supabase auth.users profile extension)
  └── user_permissions (Granular capabilities like can_manage_rates)

[Module 2: Travel Agency Hierarchy]
  ├── travel_agencies (Parent agency records)
  ├── agency_markets (Regional desks per agency)
  └── agency_members (Internal contact profiles)

[Module 3: Hotel & Seasonal Calendar]
  ├── hotels (Partner property profiles)
  └── hotel_seasons (Property-specific date periods)

[Module 4: Rate Architecture & Special Rates]
  ├── hotel_rate_sheets (Versioned pricing heads: Draft, Published, Archived)
  ├── hotel_rate_components (Configured base rates, reductions, supplements)
  ├── hotel_rate_outputs (Calculated or published tier prices: Red, Green, Yellow)
  └── agency_special_rates (Agency-negotiated VIP slots 1, 2, 3)

[Module 5: Immutable Quote Snapshots & Distribution]
  ├── quotes (Master quote header, sender, scope, status)
  ├── quote_recipients (Frozen recipient contacts and per-recipient status)
  ├── quote_items (Frozen hotel room prices, currency, and tiers)
  └── quote_email_attempts (Email delivery audit logs: sending, sent, failed)

[Module 6: Internal Sales Team Notifications]
  ├── sales_team_memberships (Fixed group member tracking)
  └── notifications (In-app alerts for quote shares and chat mentions)

[Module 7: Sales Activities & Voice Recordings]
  ├── sales_activities (Phone calls, visits, voice interaction notes)
  └── sales_activity_attachments (Audio storage references and transcription metadata)

[Module 8: Internal Team Chat & Realtime Messaging]
  ├── chat_groups (Admin-created conversation channels)
  ├── chat_group_members (Staff channel membership roster)
  ├── chat_messages (Real-time message stream with sender attribution)
  ├── chat_message_attachments (Image and audio storage references)
  ├── chat_message_mentions (@mention tracking for notifications)
  └── chat_read_receipts (Unread counter and delivery tracking)

[Module 9: Audit Logs & System Integrity]
  └── audit_logs (Immutable audit trail of sensitive rate & administrative changes)
```

---

## 4. Entity Relationships & Foreign Key Strategy

### Composite Referential Integrity Summary:
1. **Agency Hierarchy:** `agency_members (market_id, agency_id)` → `agency_markets (id, agency_id)`
2. **Hotel Seasons:** `hotel_rate_sheets (season_id, hotel_id)` → `hotel_seasons (id, hotel_id)`
3. **Special Rates:** `agency_special_rates (season_id, hotel_id)` → `hotel_seasons (id, hotel_id)`
4. **Quote Markets:** `quotes (market_id, agency_id)` → `agency_markets (id, agency_id)`
5. **Quote Items:** `quote_items (season_id, hotel_id)` → `hotel_seasons (id, hotel_id)`
6. **Sales Activities:** `sales_activities (market_id, agency_id)` → `agency_markets (id, agency_id)`
7. **Sales Activity Contacts:** `sales_activities (member_id, agency_id)` → `agency_members (id, agency_id)`
8. **Chat Sender Membership:** `chat_messages (group_id, sender_id)` → `chat_group_members (group_id, user_id)`
9. **Chat Read Receipts:** `chat_read_receipts (last_read_message_id, group_id)` → `chat_messages (id, group_id)`

---

## 5. Monetary & Timestamp Precision Standards

1. **Monetary Quantities (`NUMERIC(12, 2)`):** Floating-point data types (`FLOAT`, `REAL`, `DOUBLE PRECISION`) are **strictly prohibited** for prices, reductions, supplements, or quotes due to binary floating-point rounding errors. All currency figures use `NUMERIC(12, 2)`.
2. **Currencies (`VARCHAR(3)`):** Stored as standard ISO-4217 3-character codes (e.g. `'USD'`, `'EUR'`, `'LKR'`).
3. **Timestamps (`TIMESTAMPTZ`):** All dates and times are stored with timezone offsets in UTC.
4. **Calendar Validity (`DATE`):** Date ranges (`date_from`, `date_to`, `date_in`, `date_out`) use PostgreSQL native `DATE` type with explicit `CHECK (date_to >= date_from)` constraints.
