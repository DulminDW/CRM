# WINDOW COMPANIES CRM — DATABASE CONSTRAINTS & INDEXES SPECIFICATION (PHASE 2A REVISED)

**Document Version:** 1.1.0 (Technical Reference — Revised)  
**Status Date:** November 02, 2026  
**Classification:** Internal Technical Reference  

---

## 1. Relational Integrity, Composite Foreign Keys & Delete Behaviors (`ON DELETE`)

In a financial sales CRM, cascading deletes can inadvertently destroy legal records, quotes, and audit trails. The revised schema enforces strict referential consistency and multi-column foreign keys:

### 1.1 Complete Foreign Key Reference & Delete Behavior Table

| Child Table | Foreign Key Column(s) | Parent Table | Parent Key Column(s) | `ON DELETE` Action | Enforced Integrity Rule |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `user_permissions` | `user_id` | `user_profiles` | `id` | `CASCADE` | If a user account is deleted, permission records are cleaned up. |
| `user_permissions` | `granted_by` | `user_profiles` | `id` | `RESTRICT` | An Admin who granted permissions cannot be deleted while records exist. |
| `agency_markets` | `agency_id` | `travel_agencies` | `id` | `RESTRICT` | Travel agencies with regional market desks cannot be deleted. |
| `agency_members` | `agency_id` | `travel_agencies` | `id` | `RESTRICT` | Agencies with contact profiles cannot be deleted. |
| `agency_members` | `(market_id, agency_id)` | `agency_markets` | `(id, agency_id)` | `RESTRICT` | **Composite FK:** Prevents assigning a member to Agency A while selecting Agency B's market. |
| `hotel_seasons` | `hotel_id` | `hotels` | `id` | `RESTRICT` | Partner hotels with seasonal periods cannot be deleted. |
| `hotel_rate_sheets`| `hotel_id` | `hotels` | `id` | `RESTRICT` | Hotels with pricing schedules cannot be deleted. |
| `hotel_rate_sheets`| `(season_id, hotel_id)` | `hotel_seasons` | `(id, hotel_id)` | `RESTRICT` | **Composite FK:** Guarantees rate sheet references a season belonging to the *same* hotel. |
| `hotel_rate_components`| `rate_sheet_id`| `hotel_rate_sheets`| `id` | `CASCADE` | Formula elements belong strictly to their parent rate sheet. |
| `hotel_rate_outputs`| `rate_sheet_id` | `hotel_rate_sheets`| `id` | `CASCADE` | Output tier prices belong strictly to their parent rate sheet. |
| `agency_special_rates`| `agency_id` | `travel_agencies` | `id` | `RESTRICT` | Agencies with negotiated special rates cannot be deleted. |
| `agency_special_rates`| `(season_id, hotel_id)`| `hotel_seasons` | `(id, hotel_id)` | `RESTRICT` | **Composite FK:** Guarantees special rate applies to the hotel's own season. |
| `quotes` | `agency_id` | `travel_agencies` | `id` | `RESTRICT` | Agencies with historical quotes cannot be deleted. |
| `quotes` | `sender_id` | `user_profiles` | `id` | `RESTRICT` | Sales staff who dispatched quotes cannot be deleted. |
| `quotes` | `(market_id, agency_id)`| `agency_markets` | `(id, agency_id)` | `RESTRICT` | **Composite FK:** Guarantees market desk belongs to the quoted agency. |
| `quote_recipients` | `quote_id` | `quotes` | `id` | `CASCADE` | If an un-dispatched draft quote is deleted, its recipient list is removed. |
| `quote_recipients` | `original_member_id` | `agency_members` | `id` | `SET NULL` | If an agency contact profile is removed, the frozen snapshot email remains intact. |
| `quote_items` | `quote_id` | `quotes` | `id` | `CASCADE` | Line items cascade with parent quote removal (draft only). |
| `quote_items` | `(season_id, hotel_id)` | `hotel_seasons` | `(id, hotel_id)` | `RESTRICT` | **Composite FK:** Guarantees room quote matches hotel property and valid season. |
| `quote_email_attempts`| `quote_id` | `quotes` | `id` | `CASCADE` | Dispatch attempts cascade with master quote. |
| `quote_email_attempts`| `recipient_id` | `quote_recipients`| `id` | `CASCADE` | Attempts linked directly to specific recipients for multi-recipient traceability. |
| `sales_activities` | `(market_id, agency_id)`| `agency_markets` | `(id, agency_id)` | `RESTRICT` | **Composite FK:** Guarantees activity market belongs to activity agency. |
| `sales_activities` | `(member_id, agency_id)`| `agency_members` | `(id, agency_id)` | `RESTRICT` | **Composite FK:** Guarantees activity contact belongs to activity agency. |
| `sales_activity_attachments`| `activity_id`| `sales_activities`| `id` | `CASCADE` | Audio metadata cascades with sales activity removal. |
| `chat_group_members`| `group_id` | `chat_groups` | `id` | `CASCADE` | Roster cascades with channel removal. |
| `chat_group_members`| `user_id` | `user_profiles` | `id` | `CASCADE` | User departure cascades from membership. |
| `chat_messages` | `(group_id, sender_id)`| `chat_group_members`| `(group_id, user_id)`| `CASCADE` | **Composite FK:** Enforces sender MUST be an enrolled member of target group. |
| `chat_message_attachments`| `message_id` | `chat_messages` | `id` | `CASCADE` | Media metadata cascades with message. |
| `chat_message_mentions`| `message_id` | `chat_messages` | `id` | `CASCADE` | Mentions cascade with message. |
| `chat_read_receipts`| `(group_id, user_id)` | `chat_group_members`| `(group_id, user_id)`| `CASCADE` | **Composite FK:** User tracking read receipt must be group member. |
| `chat_read_receipts`| `(last_read_message_id, group_id)`| `chat_messages`| `(id, group_id)`| `SET NULL` | **Composite FK:** Cursor message must belong to the exact same group channel. |
| `audit_logs` | `actor_id` | `user_profiles` | `id` | `SET NULL` | Audit logs persist forever even if staff account is deleted. |

---

## 2. Integrity & Check Constraints

### 2.1 String & Format Validations
1. **Email Syntax (`agency_members.email`):**
   ```sql
   CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
   ```
   Ensures that only syntactically valid email addresses are recorded for agency contacts, preventing header injection attacks in external quote dispatch.
2. **ISO Currency Codes (`currency`):**
   ```sql
   CHECK (char_length(currency) = 3)
   ```
   Enforces 3-letter standard currency codes (USD, EUR, LKR).
3. **Role Validation (`user_profiles.role`):**
   ```sql
   CHECK (role IN ('ADMIN', 'STAFF'))
   ```
   Restricts users to the two confirmed roles.

### 2.2 Date Validity Constraints
1. **Hotel Season Dates (`hotel_seasons`):**
   ```sql
   CHECK (date_to >= date_from)
   ```
   Guarantees the season end date cannot precede the start date.
2. **Special Rate Dates (`agency_special_rates`):**
   ```sql
   CHECK (date_out >= date_in)
   ```
   Guarantees that check-out dates cannot precede check-in dates for negotiated VIP rate slots.

### 2.3 Financial & Slot Constraints
1. **Non-Negative Amounts (`amount`):**
   ```sql
   CHECK (amount >= 0)
   ```
   Enforces that room prices, negotiated amounts, and quote line items cannot be negative.
2. **Dedicated Special Rate Slots (`agency_special_rates.slot_number`):**
   ```sql
   CHECK (slot_number IN (1, 2, 3))
   ```
   Strictly enforces the company decision that exactly three special rate slots exist.
3. **Rate Sheet Component Key Uniqueness:**
   ```sql
   CONSTRAINT uq_rate_sheet_component_key UNIQUE (rate_sheet_id, component_key)
   ```
   Prevents accidental duplicate entries of the same calculation key (e.g. two `HB_DOUBLE_BASE` entries) on a single rate sheet.

---

## 3. Unique Constraints & Duplicate Prevention

| Table | Constraint Definition | Business Requirement Enforced |
| :--- | :--- | :--- |
| `user_permissions` | `UNIQUE (user_id, permission_key)` | Prevents duplicate permission assignments for the same staff member. |
| `travel_agencies` | `UNIQUE (name)` | Prevents duplicate travel agencies from being created under the same name. |
| `agency_markets` | `UNIQUE (agency_id, market_name)` | Allows "Indian Market" to exist under multiple agencies, but not twice under the same agency. |
| `hotels` | `UNIQUE (hotel_name)` | Prevents duplicate hotel properties from being registered. |
| `hotel_seasons` | `UNIQUE (hotel_id, season_label)` | Prevents duplicate seasonal labels for the same hotel (e.g. two "2026 Summer" entries for Randoli). |
| `hotel_rate_sheets` | `UNIQUE (hotel_id, season_id, version_number)` | Enforces strict version sequencing for hotel rate schedules. |
| `hotel_rate_outputs` | `UNIQUE (rate_sheet_id, room_type, meal_plan, rate_category)` | Guarantees exactly one Red, Green, or Yellow price per room and meal plan combination. |
| `agency_special_rates`| `UNIQUE (agency_id, hotel_id, season_id, slot_number)` | Enforces exactly one Special Rate per slot (1, 2, or 3) for an agency/hotel/season combination. |
| `quotes` | `UNIQUE (quote_reference)` | Guarantees uniqueness of human-readable quote reference codes (e.g. QT-2026-0001). |
| `sales_team_memberships`| `UNIQUE (user_id)` | Enforces that an employee is enrolled at most once in the fixed Sales Team broadcast group. |
| `chat_group_members` | `UNIQUE (group_id, user_id)` | Prevents duplicate memberships in internal chat channels. |
| `chat_read_receipts` | `UNIQUE (group_id, user_id)` | Maintains a single read cursor per user per chat group. |

---

## 4. Query Performance Indexes

### 4.1 Contact & Agency Search Indexes
```sql
CREATE INDEX idx_agency_members_lower_email ON public.agency_members (LOWER(email));
CREATE INDEX idx_agency_members_agency_market ON public.agency_members (agency_id, market_id);
```

### 4.2 Rate Lookup & Quote Wizard Performance
```sql
CREATE INDEX idx_rate_sheets_lookup ON public.hotel_rate_sheets (hotel_id, season_id, status);
CREATE INDEX idx_rate_outputs_lookup ON public.hotel_rate_outputs (rate_sheet_id, rate_category);
CREATE INDEX idx_agency_special_rates_lookup ON public.agency_special_rates (agency_id, hotel_id, season_id);
```

### 4.3 Historical Quote & Contact Profile Queries
```sql
CREATE INDEX idx_quotes_agency ON public.quotes (agency_id, created_at DESC);
CREATE INDEX idx_quotes_sender ON public.quotes (sender_id, created_at DESC);
CREATE INDEX idx_quote_recipients_email ON public.quote_recipients (LOWER(original_email));
CREATE INDEX idx_quote_recipients_member ON public.quote_recipients (original_member_id);
```

### 4.4 Realtime Team Chat & Unread Count Performance
```sql
CREATE INDEX idx_chat_messages_group_created ON public.chat_messages (group_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);
```

### 4.5 Audit Trail & Compliance Queries
```sql
CREATE INDEX idx_audit_logs_target ON public.audit_logs (target_table, target_record_id, timestamp DESC);
```
