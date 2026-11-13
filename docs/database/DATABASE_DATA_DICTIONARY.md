# WINDOW COMPANIES CRM — DATA DICTIONARY (PHASE 2A REVISED)

**Document Version:** 1.1.0 (Technical Reference — Revised)  
**Status Date:** November 02, 2026  
**Classification:** Internal Technical Reference  
**Table Count:** Exactly 26 Tables Across 9 Modules  

---

## 1. Table of Contents & Entity Index

1. `user_profiles` — Internal employee account profile details.
2. `user_permissions` — Granular employee capabilities (e.g., rate management).
3. `travel_agencies` — Partner travel agency master records.
4. `agency_markets` — Regional market desks partitioned per agency.
5. `agency_members` — Internal contact profiles for agency personnel (~1,000 contacts; no login).
6. `hotels` — Partner hotel properties (Randoli, Beragala, Horton Heights, H.S.H.).
7. `hotel_seasons` — Property-specific seasonal validity dates.
8. `hotel_rate_sheets` — Versioned pricing schedules (Draft, Published, Archived).
9. `hotel_rate_components` — Flexible rate formula inputs (HB Double base, supplements, reductions).
10. `hotel_rate_outputs` — Final calculated or entered room rates (Red, Green, Yellow).
11. `agency_special_rates` — Agency-specific negotiated VIP rate slots 1, 2, and 3.
12. `quotes` — Master quote headers sent to agency contacts.
13. `quote_recipients` — Frozen snapshots of quote recipients at dispatch time.
14. `quote_items` — Frozen snapshots of quoted hotel rooms, tiers, and prices.
15. `quote_email_attempts` — Server-side email delivery attempts and audit logs.
16. `sales_team_memberships` — Fixed internal sales group roster for distribution notifications.
17. `notifications` — In-app alerts for quote distributions, chat mentions, and system updates.
18. `sales_activities` — Sales calls, meetings, and voice recording logs.
19. `sales_activity_attachments` — Private storage references for audio voice recordings.
20. `chat_groups` — Admin-created internal team chat channels.
21. `chat_group_members` — User enrollment roster for chat channels.
22. `chat_messages` — Real-time chat messages stream.
23. `chat_message_attachments` — Image and voice note storage metadata for chat.
24. `chat_message_mentions` — `@name` mention records triggering notifications.
25. `chat_read_receipts` — Per-user read cursors for unread counters.
26. `audit_logs` — Immutable audit log of administrative and rate changes.

---

## 2. Comprehensive Data Dictionary Tables (Updated with Composite Foreign Keys)

### 2.1 `user_profiles`
*Purpose:* Extends Supabase `auth.users` for internal company employees (5–15 staff).

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK, FK | — | References `auth.users(id)` ON DELETE RESTRICT | Internal employee unique ID. Matches auth UID. |
| `full_name` | `VARCHAR(255)`| NO | — | — | `CHECK (char_length(full_name) >= 2)` | Employee display name. |
| `role` | `VARCHAR(20)` | NO | — | `'STAFF'` | `CHECK (role IN ('ADMIN', 'STAFF'))` | Core system role. Admin has full rights. |
| `is_active` | `BOOLEAN` | NO | — | `TRUE` | — | Status flag. Inactive employees cannot query data. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Timestamp of account creation. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Timestamp of last profile update. |

---

### 2.2 `user_permissions`
*Purpose:* Isolates granular capabilities granted by Admins, such as `can_manage_rates`.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Unique permission record identifier. |
| `user_id` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE CASCADE | Staff member receiving permission. |
| `permission_key`| `VARCHAR(50)` | NO | — | — | `CHECK (permission_key IN ('CAN_MANAGE_RATES', 'CAN_MANAGE_USERS', 'CAN_CREATE_CHAT_GROUPS'))` | Specific granted capability. |
| `granted_by` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE RESTRICT | Admin user who authorized the permission. |
| `granted_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Timestamp when capability was granted. |

*Unique Index:* `UNIQUE (user_id, permission_key)`

---

### 2.3 `travel_agencies`
*Purpose:* Stores partner travel agencies / DMCs (e.g. Jetwing Travels). Top level of agency hierarchy.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Agency unique identifier. |
| `name` | `VARCHAR(255)`| NO | — | — | `CHECK (char_length(name) >= 2)` | Official travel agency name. |
| `code` | `VARCHAR(50)` | YES| — | `NULL` | — | Optional internal short code. |
| `country` | `VARCHAR(100)`| YES| — | `NULL` | — | Agency country of operation. |
| `city` | `VARCHAR(100)`| YES| — | `NULL` | — | Agency city. |
| `phone` | `VARCHAR(50)` | YES| — | `NULL` | — | Main agency phone number. |
| `email` | `VARCHAR(255)`| YES| — | `NULL` | — | General inquiries email. |
| `status` | `VARCHAR(20)` | NO | — | `'ACTIVE'` | `CHECK (status IN ('ACTIVE', 'INACTIVE'))` | Agency operational status. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Update timestamp. |

*Unique Index:* `UNIQUE (name)`

---

### 2.4 `agency_markets`
*Purpose:* Regional market desks belonging to a specific travel agency (e.g. Indian Market, Europe Market).

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Market unique identifier. |
| `agency_id` | `UUID` | NO | FK | — | References `travel_agencies(id)` ON DELETE RESTRICT | Parent travel agency. |
| `market_name` | `VARCHAR(100)`| NO | — | — | `CHECK (char_length(market_name) >= 2)` | Name of market desk. |
| `description` | `TEXT` | YES| — | `NULL` | — | Optional market notes. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Update timestamp. |

*Unique Constraints:* `UNIQUE (agency_id, market_name)`, `UNIQUE (id, agency_id)`

---

### 2.5 `agency_members`
*Purpose:* Internal contact profiles for agency personnel (~1,000 contacts; e.g. Sarith, Jana, Priya). **NO CRM LOGIN ACCOUNTS.**

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Contact profile UUID. |
| `agency_id` | `UUID` | NO | FK | — | References `travel_agencies(id)` ON DELETE RESTRICT | Employing travel agency. |
| `market_id` | `UUID` | NO | FK | — | Composite FK: `(market_id, agency_id) REFERENCES agency_markets(id, agency_id)` | Assigned market desk. Enforces market belongs to agency. |
| `full_name` | `VARCHAR(255)`| NO | — | — | `CHECK (char_length(full_name) >= 2)` | Contact full name. |
| `email` | `VARCHAR(255)`| NO | — | — | `CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')` | Contact business email address. |
| `phone` | `VARCHAR(50)` | YES| — | `NULL` | — | Direct phone / mobile. |
| `position` | `VARCHAR(100)`| YES| — | `NULL` | — | Title (e.g. Manager, Senior Executive). |
| `member_code`| `VARCHAR(50)` | YES| — | `NULL` | — | Internal/external reference code. |
| `status` | `VARCHAR(20)` | NO | — | `'ACTIVE'` | `CHECK (status IN ('ACTIVE', 'INACTIVE'))` | Contact status. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Profile creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Profile update timestamp. |

*Composite Unique:* `UNIQUE (id, agency_id)`  
*Indexes:* Functional search index on `LOWER(email)`. Compound index on `(agency_id, market_id)`.

---

### 2.6 `hotels`
*Purpose:* Partner hotel properties (Randoli, Beragala, Horton Heights, H.S.H.).

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Hotel unique identifier. |
| `hotel_name` | `VARCHAR(255)`| NO | — | — | `CHECK (char_length(hotel_name) >= 2)` | Hotel property name. |
| `hotel_code` | `VARCHAR(50)` | YES| — | `NULL` | — | Short identifier code. |
| `area` | `VARCHAR(100)`| YES| — | `NULL` | — | Geographic area / district. |
| `service_type`| `VARCHAR(20)` | NO | — | `'BOTH'` | `CHECK (service_type IN ('ONLINE', 'OFFLINE', 'BOTH'))` | Legacy PDF service classification. |
| `status` | `VARCHAR(20)` | NO | — | `'ACTIVE'` | `CHECK (status IN ('ACTIVE', 'INACTIVE'))` | Property operational status. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Update timestamp. |

*Unique Index:* `UNIQUE (hotel_name)`

---

### 2.7 `hotel_seasons`
*Purpose:* Property-specific seasonal periods (e.g. 2026 Summer, 2026/27 Winter).

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Season unique identifier. |
| `hotel_id` | `UUID` | NO | FK | — | References `hotels(id)` ON DELETE RESTRICT | Property this season belongs to. |
| `season_label`| `VARCHAR(100)`| NO | — | — | `CHECK (char_length(season_label) >= 2)` | e.g. "2026 Summer", "2026/27 Winter". |
| `date_from` | `DATE` | NO | — | — | — | Start date of seasonal period. |
| `date_to` | `DATE` | NO | — | — | `CHECK (date_to >= date_from)` | End date of seasonal period. |
| `status` | `VARCHAR(20)` | NO | — | `'ACTIVE'` | `CHECK (status IN ('ACTIVE', 'UPCOMING', 'EXPIRED'))` | Seasonal lifecycle state. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Update timestamp. |

*Unique Constraints:* `UNIQUE (hotel_id, season_label)`, `UNIQUE (id, hotel_id)`

---

### 2.8 `hotel_rate_sheets`
*Purpose:* Versioned pricing schedule headers. Composite FK enforces season belongs to hotel.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Rate sheet unique identifier. |
| `hotel_id` | `UUID` | NO | FK | — | References `hotels(id)` ON DELETE RESTRICT | Target hotel. |
| `season_id` | `UUID` | NO | FK | — | Composite FK: `(season_id, hotel_id) REFERENCES hotel_seasons(id, hotel_id)` | Target season. Enforces season belongs to hotel. |
| `version_number`| `INTEGER` | NO | — | `1` | `CHECK (version_number >= 1)` | Incremental version number. |
| `status` | `VARCHAR(20)` | NO | — | `'DRAFT'` | `CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))` | Rate schedule lifecycle state. |
| `currency` | `VARCHAR(3)` | NO | — | `'USD'` | `CHECK (char_length(currency) = 3)` | ISO currency code (USD, EUR, LKR). |
| `notes` | `TEXT` | YES| — | `NULL` | — | Internal pricing notes. |
| `created_by` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE RESTRICT | Staff member who created draft. |
| `published_by`| `UUID` | YES| FK | `NULL` | References `user_profiles(id)` ON DELETE RESTRICT | Authorized staff/admin who published. |
| `published_at`| `TIMESTAMPTZ` | YES| — | `NULL` | — | Publication timestamp. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Update timestamp. |

*Unique Constraints:* `UNIQUE (hotel_id, season_id, version_number)`, `UNIQUE (id, hotel_id, season_id)`

---

### 2.9 `hotel_rate_components`
*Purpose:* Hotel-specific formula inputs (HB Double Base, Single Reduction, Triple Supplement, BB Reduction).

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Component record identifier. |
| `rate_sheet_id`| `UUID` | NO | FK | — | References `hotel_rate_sheets(id)` ON DELETE CASCADE| Associated rate sheet. |
| `component_key`| `VARCHAR(50)` | NO | — | — | `CHECK (char_length(component_key) >= 2)` | Identifier (e.g. HB_DOUBLE_BASE). |
| `component_value`| `NUMERIC(12,2)`| NO | — | `0.00` | — | Value or supplement/reduction amount. |
| `description` | `VARCHAR(255)`| YES| — | `NULL` | — | Description of component role. |

*Unique Index:* `UNIQUE (rate_sheet_id, component_key)`

---

### 2.10 `hotel_rate_outputs`
*Purpose:* Pre-calculated or published room rates by category tier (RED, GREEN, YELLOW).

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Rate output identifier. |
| `rate_sheet_id`| `UUID` | NO | FK | — | References `hotel_rate_sheets(id)` ON DELETE CASCADE| Parent rate sheet. |
| `room_type` | `VARCHAR(100)`| NO | — | — | `CHECK (char_length(room_type) >= 2)` | Single, Double, Triple, Suite, etc. |
| `meal_plan` | `VARCHAR(20)` | NO | — | — | `CHECK (meal_plan IN ('RO', 'BB', 'HB', 'FB', 'AI'))` | Meal plan code. |
| `rate_category`| `VARCHAR(20)` | NO | — | — | `CHECK (rate_category IN ('RED', 'GREEN', 'YELLOW'))` | Internal tier (Lowest, Normal, Highest). |
| `amount` | `NUMERIC(12,2)`| NO | — | — | `CHECK (amount >= 0)` | Numeric price per unit/night. |
| `currency` | `VARCHAR(3)` | NO | — | `'USD'` | `CHECK (char_length(currency) = 3)` | ISO currency code. |

*Unique Index:* `UNIQUE (rate_sheet_id, room_type, meal_plan, rate_category)`

---

### 2.11 `agency_special_rates`
*Purpose:* Agency-specific negotiated VIP rate slots 1, 2, and 3. Composite FK enforces season belongs to hotel.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Special rate identifier. |
| `agency_id` | `UUID` | NO | FK | — | References `travel_agencies(id)` ON DELETE RESTRICT | Negotiated agency. |
| `hotel_id` | `UUID` | NO | FK | — | References `hotels(id)` ON DELETE RESTRICT | Target hotel. |
| `season_id` | `UUID` | NO | FK | — | Composite FK: `(season_id, hotel_id) REFERENCES hotel_seasons(id, hotel_id)` | Applicable seasonal validity. |
| `slot_number` | `INTEGER` | NO | — | — | `CHECK (slot_number IN (1, 2, 3))` | Dedicated slots 1, 2, or 3. |
| `room_type` | `VARCHAR(100)`| NO | — | `'Standard'`| — | Applicable room category. |
| `meal_plan` | `VARCHAR(20)` | NO | — | `'HB'` | — | Applicable meal plan. |
| `amount` | `NUMERIC(12,2)`| NO | — | — | `CHECK (amount >= 0)` | Negotiated special price. |
| `currency` | `VARCHAR(3)` | NO | — | `'USD'` | `CHECK (char_length(currency) = 3)` | ISO currency code. |
| `date_in` | `DATE` | NO | — | — | — | Check-in validity date. |
| `date_out` | `DATE` | NO | — | — | `CHECK (date_out >= date_in)` | Check-out validity date. |
| `notes` | `TEXT` | YES| — | `NULL` | — | Commercial justification / notes. |
| `created_by` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE RESTRICT | Staff member who negotiated. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Record update timestamp. |

*Unique Index:* `UNIQUE (agency_id, hotel_id, season_id, slot_number)`

---

### 2.12 `quotes`
*Purpose:* Master quote dispatch record sent to agency contacts. Composite FK enforces market belongs to agency.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Quote unique identifier. |
| `quote_reference`| `VARCHAR(50)`| NO | — | — | `CHECK (char_length(quote_reference) >= 6)` | Human-readable quote ID (e.g. QT-2026-0001). |
| `sender_id` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE RESTRICT | Sales staff who created/sent quote. |
| `agency_id` | `UUID` | NO | FK | — | References `travel_agencies(id)` ON DELETE RESTRICT | Recipient agency. |
| `market_id` | `UUID` | YES| FK | `NULL` | Composite FK: `(market_id, agency_id) REFERENCES agency_markets(id, agency_id)` | Selected market desk (if market scope). |
| `recipient_scope`| `VARCHAR(20)`| NO | — | — | `CHECK (recipient_scope IN ('INDIVIDUAL', 'ENTIRE_MARKET', 'ENTIRE_AGENCY'))` | Distribution scope. |
| `quote_lifecycle`| `VARCHAR(20)`| NO | — | `'DRAFT'` | `CHECK (quote_lifecycle IN ('DRAFT', 'DISPATCHED', 'CANCELLED'))` | Master quote editing status. |
| `email_status`| `VARCHAR(20)` | NO | — | `'NOT_SENT'`| `CHECK (email_status IN ('NOT_SENT', 'QUEUED', 'PARTIALLY_SENT', 'SENT', 'FAILED'))` | Overall email dispatch summary status. |
| `email_subject`| `VARCHAR(255)`| NO | — | — | — | Outgoing email subject line. |
| `email_body_html`| `TEXT` | NO | — | — | — | Rendered body snapshot (internal tags stripped). |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Quote creation timestamp. |
| `sent_at` | `TIMESTAMPTZ` | YES| — | `NULL` | — | Timestamp when email was successfully sent. |

*Unique Constraints:* `UNIQUE (quote_reference)`, `UNIQUE (id, agency_id)`

---

### 2.13 `quote_recipients`
*Purpose:* Frozen contact snapshot of every recipient at dispatch time.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Recipient snapshot identifier. |
| `quote_id` | `UUID` | NO | FK | — | References `quotes(id)` ON DELETE CASCADE | Associated master quote. |
| `original_member_id`| `UUID` | YES| FK | `NULL` | References `agency_members(id)` ON DELETE SET NULL | Contact ID if individual scope. |
| `original_full_name`| `VARCHAR(255)`| NO | — | — | — | Frozen recipient full name at send time. |
| `original_email`| `VARCHAR(255)`| NO | — | — | — | Frozen recipient email address at send time. |
| `original_agency_name`| `VARCHAR(255)`| NO | — | — | — | Frozen agency name. |
| `original_market_name`| `VARCHAR(100)`| YES| — | `NULL` | — | Frozen market desk name. |
| `delivery_status`| `VARCHAR(20)`| NO | — | `'PENDING'` | `CHECK (delivery_status IN ('PENDING', 'SENT', 'FAILED'))` | Individual delivery outcome. |
| `sent_at` | `TIMESTAMPTZ` | YES| — | `NULL` | — | Timestamp of delivery to this recipient. |
| `error_message`| `TEXT` | YES| — | `NULL` | — | Error details if delivery failed. |

---

### 2.14 `quote_items`
*Purpose:* Frozen snapshot of hotel room line items, tiers, and prices. Composite FK enforces season belongs to hotel.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Line item snapshot identifier. |
| `quote_id` | `UUID` | NO | FK | — | References `quotes(id)` ON DELETE CASCADE | Associated master quote. |
| `hotel_id` | `UUID` | NO | FK | — | References `hotels(id)` ON DELETE RESTRICT | Hotel property. |
| `season_id` | `UUID` | NO | FK | — | Composite FK: `(season_id, hotel_id) REFERENCES hotel_seasons(id, hotel_id)` | Season period. |
| `rate_sheet_id`| `UUID` | YES| FK | `NULL` | References `hotel_rate_sheets(id)` ON DELETE RESTRICT| Rate sheet version used (if standard). |
| `rate_sheet_version_snapshot`| `INTEGER`| YES| — | `NULL` | — | Frozen version number of rate sheet. |
| `hotel_name_snapshot`| `VARCHAR(255)`| NO | — | — | — | Frozen hotel name. |
| `season_label_snapshot`| `VARCHAR(100)`| NO | — | — | — | Frozen season name. |
| `room_type_snapshot`| `VARCHAR(100)`| NO | — | — | — | Frozen room type. |
| `meal_plan_snapshot`| `VARCHAR(20)`| NO | — | — | — | Frozen meal plan. |
| `rate_category`| `VARCHAR(20)`| NO | — | — | `CHECK (rate_category IN ('RED', 'GREEN', 'YELLOW', 'SPECIAL_1', 'SPECIAL_2', 'SPECIAL_3', 'CUSTOM'))` | Applied tier. |
| `quoted_amount`| `NUMERIC(12,2)`| NO | — | — | `CHECK (quoted_amount >= 0)` | Frozen final quoted price. |
| `currency` | `VARCHAR(3)` | NO | — | `'USD'` | `CHECK (char_length(currency) = 3)` | Frozen currency. |
| `custom_notes` | `TEXT` | YES| — | `NULL` | — | Custom conditions if entered. |

---

### 2.15 `quote_email_attempts`
*Purpose:* Audit trail of email dispatch attempts per recipient.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Attempt unique identifier. |
| `quote_id` | `UUID` | NO | FK | — | References `quotes(id)` ON DELETE CASCADE | Associated quote. |
| `recipient_id` | `UUID` | YES| FK | `NULL` | References `quote_recipients(id)` ON DELETE CASCADE | Target recipient for multi-recipient traceability. |
| `attempt_number`| `INTEGER` | NO | — | `1` | `CHECK (attempt_number >= 1)` | Sequence number of dispatch attempt. |
| `delivery_status`| `VARCHAR(20)`| NO | — | — | `CHECK (delivery_status IN ('SENDING', 'SENT', 'FAILED'))` | Attempt outcome. |
| `provider_message_id`| `VARCHAR(255)`| YES| — | `NULL` | — | Mail gateway message ID (e.g. Resend ID). |
| `error_message`| `TEXT` | YES| — | `NULL` | — | Failure error message if failed. |
| `attempted_at`| `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Timestamp of send attempt. |

---

### 2.16 `sales_team_memberships`
*Purpose:* Roster of company employees belonging to the fixed internal Sales Team broadcast group.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Membership identifier. |
| `user_id` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE CASCADE | Sales employee receiving alerts. |
| `added_by` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE RESTRICT | Admin who added employee to team. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Date added to team. |

*Unique Index:* `UNIQUE (user_id)`

---

### 2.17 `notifications`
*Purpose:* In-app alert queue for quote distributions, chat mentions, and operational notices.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Notification identifier. |
| `user_id` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE CASCADE | Recipient staff member. |
| `event_type` | `VARCHAR(50)` | NO | — | — | `CHECK (event_type IN ('QUOTE_SHARED', 'CHAT_MENTION', 'SPECIAL_RATE_CREATED', 'SYSTEM_ALERT'))` | Notification event category. |
| `title` | `VARCHAR(255)`| NO | — | — | — | Short alert headline. |
| `message` | `TEXT` | NO | — | — | — | Alert narrative details. |
| `reference_type`| `VARCHAR(50)`| YES| — | `NULL` | — | e.g. `'QUOTE'`, `'CHAT_MESSAGE'`. |
| `reference_id`| `UUID` | YES| — | `NULL` | — | Foreign record identifier. |
| `is_read` | `BOOLEAN` | NO | — | `FALSE` | — | Read status cursor. |
| `read_at` | `TIMESTAMPTZ` | YES| — | `NULL` | — | Timestamp when read by user. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Notification timestamp. |

---

### 2.18 `sales_activities`
*Purpose:* Sales interactions, phone calls, and voice recording logs. Composite FK enforces market & member belong to agency.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Activity unique identifier. |
| `staff_id` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE RESTRICT | Staff member who conducted activity. |
| `agency_id` | `UUID` | NO | FK | — | References `travel_agencies(id)` ON DELETE RESTRICT | Linked travel agency. |
| `market_id` | `UUID` | YES| FK | `NULL` | Composite FK: `(market_id, agency_id) REFERENCES agency_markets(id, agency_id)` | Linked market desk. |
| `member_id` | `UUID` | YES| FK | `NULL` | Composite FK: `(member_id, agency_id) REFERENCES agency_members(id, agency_id)` | Linked contact person. |
| `hotel_id` | `UUID` | YES| FK | `NULL` | References `hotels(id)` ON DELETE RESTRICT | Discussed hotel property. |
| `activity_date`| `DATE` | NO | — | `CURRENT_DATE` | — | Date of interaction. |
| `activity_type`| `VARCHAR(50)`| NO | — | `'PHONE_CALL'` | `CHECK (activity_type IN ('PHONE_CALL', 'MEETING', 'EMAIL_DISCUSSION', 'VOICE_NOTE', 'OTHER'))` | Interaction classification. |
| `notes` | `TEXT` | NO | — | — | — | Discussion notes / summary. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Record update timestamp. |

---

### 2.19 `sales_activity_attachments`
*Purpose:* Storage references for voice recordings attached to sales activities.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Attachment unique identifier. |
| `activity_id` | `UUID` | NO | FK | — | References `sales_activities(id)` ON DELETE CASCADE | Parent sales activity. |
| `storage_bucket`| `VARCHAR(100)`| NO | — | `'private-audio'` | — | Private Supabase Storage bucket. |
| `storage_path`| `VARCHAR(500)`| NO | — | — | — | Object path in storage bucket. |
| `file_name` | `VARCHAR(255)`| NO | — | — | — | Original uploaded file name. |
| `mime_type` | `VARCHAR(100)`| NO | — | — | `CHECK (mime_type IN ('audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'))` | Restricts to approved audio formats. |
| `file_size_bytes`| `BIGINT` | NO | — | — | `CHECK (file_size_bytes <= 15728640)` | Size cap (Max 15MB). |
| `transcription_language`| `VARCHAR(20)`| YES| — | `NULL` | — | Selected language (e.g. 'en', 'si'). |
| `transcription_text`| `TEXT` | YES| — | `NULL` | — | Speech-to-text transcript output. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Upload timestamp. |

---

### 2.20 `chat_groups`
*Purpose:* Internal WhatsApp-style team chat channels. Only Admins can create groups.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Channel identifier. |
| `name` | `VARCHAR(100)`| NO | — | — | `CHECK (char_length(name) >= 2)` | Channel name. |
| `description` | `TEXT` | YES| — | `NULL` | — | Channel description. |
| `created_by` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE RESTRICT | Admin who created group. |
| `is_archived` | `BOOLEAN` | NO | — | `FALSE` | — | Archive flag. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Channel creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Channel update timestamp. |

---

### 2.21 `chat_group_members`
*Purpose:* Enrolled staff roster for chat groups.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Membership identifier. |
| `group_id` | `UUID` | NO | FK | — | References `chat_groups(id)` ON DELETE CASCADE | Chat channel. |
| `user_id` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE CASCADE | Enrolled employee. |
| `joined_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Timestamp of joining channel. |

*Unique Constraints:* `UNIQUE (group_id, user_id)`

---

### 2.22 `chat_messages`
*Purpose:* Real-time messages sent within chat channels. Composite FK enforces sender is enrolled member.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Message unique identifier. |
| `group_id` | `UUID` | NO | FK | — | References `chat_groups(id)` ON DELETE CASCADE | Channel message was posted in. |
| `sender_id` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE RESTRICT | Author employee. |
| `message_type`| `VARCHAR(20)` | NO | — | `'TEXT'` | `CHECK (message_type IN ('TEXT', 'IMAGE', 'AUDIO', 'SYSTEM'))` | Message format. |
| `message_text`| `TEXT` | YES| — | `NULL` | — | Text content (if text message). |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Message timestamp. |

*Composite FK:* `(group_id, sender_id) REFERENCES chat_group_members(group_id, user_id)`  
*Composite Unique:* `UNIQUE (id, group_id)`

---

### 2.23 `chat_message_attachments`
*Purpose:* Storage references for media and voice notes sent in chat.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Attachment identifier. |
| `message_id` | `UUID` | NO | FK | — | References `chat_messages(id)` ON DELETE CASCADE | Parent chat message. |
| `storage_bucket`| `VARCHAR(100)`| NO | — | `'private-chat'` | — | Private storage bucket name. |
| `storage_path`| `VARCHAR(500)`| NO | — | — | — | Storage object path. |
| `file_name` | `VARCHAR(255)`| NO | — | — | — | Upload file name. |
| `mime_type` | `VARCHAR(100)`| NO | — | — | — | Allowed MIME (image/jpeg, png, audio/webm). |
| `file_size_bytes`| `BIGINT` | NO | — | — | `CHECK (file_size_bytes <= 26214400)` | Size cap (Max 25MB). |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Upload timestamp. |

---

### 2.24 `chat_message_mentions`
*Purpose:* Explicit `@user` mentions inside chat messages.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Mention record identifier. |
| `message_id` | `UUID` | NO | FK | — | References `chat_messages(id)` ON DELETE CASCADE | Parent message. |
| `mentioned_user_id`| `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE CASCADE | Mentioned staff member. |
| `created_at` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Timestamp. |

*Unique Index:* `UNIQUE (message_id, mentioned_user_id)`

---

### 2.25 `chat_read_receipts`
*Purpose:* Tracks the last read message per user per group. Composite FKs enforce user and message belong to group.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Receipt record identifier. |
| `group_id` | `UUID` | NO | FK | — | References `chat_groups(id)` ON DELETE CASCADE | Channel. |
| `user_id` | `UUID` | NO | FK | — | References `user_profiles(id)` ON DELETE CASCADE | Staff member. |
| `last_read_message_id`| `UUID` | YES| FK | `NULL` | Composite FK: `(last_read_message_id, group_id) REFERENCES chat_messages(id, group_id)` | Cursor of last read message. |
| `last_read_at`| `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Timestamp of last read action. |

*Composite FK:* `(group_id, user_id) REFERENCES chat_group_members(group_id, user_id)`  
*Unique Index:* `UNIQUE (group_id, user_id)`

---

### 2.26 `audit_logs`
*Purpose:* Immutable system audit log. Captures administrative and rate changes.

| Column Name | Data Type | Nullable | Key | Default | Constraints & Checks | Description & Security Classification |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | PK | `gen_random_uuid()` | — | Audit event UUID. |
| `actor_id` | `UUID` | YES| FK | `NULL` | References `user_profiles(id)` ON DELETE SET NULL | Staff member initiating change. |
| `action` | `VARCHAR(50)` | NO | — | — | `CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'PUBLISH', 'GRANT', 'REVOKE'))` | Event action type. |
| `target_table`| `VARCHAR(100)`| NO | — | — | — | Affected table name. |
| `target_record_id`| `UUID` | YES| — | `NULL` | — | Affected record primary key. |
| `old_values` | `JSONB` | YES| — | `NULL` | — | Pre-update snapshot. Secrets scrubbed. |
| `new_values` | `JSONB` | YES| — | `NULL` | — | Post-update snapshot. Secrets scrubbed. |
| `ip_address` | `INET` | YES| — | `NULL` | — | Client IP address. |
| `user_agent` | `TEXT` | YES| — | `NULL` | — | Browser/client user agent string. |
| `timestamp` | `TIMESTAMPTZ` | NO | — | `CURRENT_TIMESTAMP` | — | Event timestamp. |
