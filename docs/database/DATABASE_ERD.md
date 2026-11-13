# WINDOW COMPANIES CRM — ENTITY RELATIONSHIP DIAGRAMS (PHASE 2A REVISED)

**Document Version:** 1.1.0 (Design Draft — Revised)  
**Status Date:** November 02, 2026  
**Notation:** Mermaid ER Diagram Syntax  
**Table Count:** Exactly 26 Tables Across 9 Modules  

---

## 1. Diagram 1: Employees, Authentication & Agency Contact Hierarchy

```mermaid
erDiagram
    AUTH_USERS ||--o| USER_PROFILES : "extends (same UUID)"
    USER_PROFILES ||--o{ USER_PERMISSIONS : "holds"
    USER_PROFILES ||--o{ SALES_TEAM_MEMBERSHIPS : "assigned_to"

    TRAVEL_AGENCIES ||--o{ AGENCY_MARKETS : "contains"
    AGENCY_MARKETS ||--o{ AGENCY_MEMBERS : "contains (via composite FK)"
    TRAVEL_AGENCIES ||--o{ AGENCY_MEMBERS : "parent_agency"

    AUTH_USERS {
        uuid id PK "Supabase Auth UID"
        string email "Internal login email"
    }

    USER_PROFILES {
        uuid id PK "Matches auth.users(id)"
        string full_name "Employee full name"
        string role "ADMIN or STAFF"
        boolean is_active "Operational status"
        timestamptz created_at "Created timestamp"
        timestamptz updated_at "Updated timestamp"
    }

    USER_PERMISSIONS {
        uuid id PK "Permission record UUID"
        uuid user_id FK "References user_profiles(id)"
        string permission_key "e.g. CAN_MANAGE_RATES"
        uuid granted_by FK "References user_profiles(id)"
        timestamptz granted_at "Grant timestamp"
    }

    TRAVEL_AGENCIES {
        uuid id PK "Agency UUID"
        string name "e.g. Jetwing Travels"
        string code "Optional agency short code"
        string status "ACTIVE or INACTIVE"
        timestamptz created_at "Created timestamp"
    }

    AGENCY_MARKETS {
        uuid id PK "Market UUID"
        uuid agency_id FK "References travel_agencies(id)"
        string market_name "e.g. Indian Market, Europe Market"
        timestamptz created_at "Created timestamp"
    }

    AGENCY_MEMBERS {
        uuid id PK "Contact UUID (No Login)"
        uuid agency_id FK "References travel_agencies(id)"
        uuid market_id FK "Composite FK with agency_id to agency_markets"
        string full_name "e.g. Sarith, Jana, Priya"
        string email "Contact email"
        string phone "Direct contact phone"
        string position "e.g. Manager, Senior Executive"
        string member_code "External identifier"
        string status "ACTIVE or INACTIVE"
        timestamptz created_at "Created timestamp"
    }
```

---

## 2. Diagram 2: Hotels, Seasons, Rate Versioning & Special Rates

```mermaid
erDiagram
    HOTELS ||--o{ HOTEL_SEASONS : "operates"
    HOTELS ||--o{ HOTEL_RATE_SHEETS : "applies_to"
    HOTEL_SEASONS ||--o{ HOTEL_RATE_SHEETS : "valid_during (via composite FK)"

    HOTEL_RATE_SHEETS ||--o{ HOTEL_RATE_COMPONENTS : "configured_with"
    HOTEL_RATE_SHEETS ||--o{ HOTEL_RATE_OUTPUTS : "generates_tiers"

    TRAVEL_AGENCIES ||--o{ AGENCY_SPECIAL_RATES : "negotiates_for"
    HOTELS ||--o{ AGENCY_SPECIAL_RATES : "applies_to_hotel"
    HOTEL_SEASONS ||--o{ AGENCY_SPECIAL_RATES : "applies_to_season (via composite FK)"

    HOTELS {
        uuid id PK "Hotel UUID"
        string hotel_name "Randoli, Beragala, Horton Heights, H.S.H"
        string hotel_code "Unique property code"
        string area "Region / District"
        string service_type "ONLINE, OFFLINE, BOTH"
        string status "ACTIVE or INACTIVE"
    }

    HOTEL_SEASONS {
        uuid id PK "Season UUID"
        uuid hotel_id FK "References hotels(id)"
        string season_label "e.g. 2026 Summer, 2026/27 Winter"
        date date_from "Validity start date"
        date date_to "Validity end date"
        string status "ACTIVE, UPCOMING, EXPIRED"
    }

    HOTEL_RATE_SHEETS {
        uuid id PK "Rate Sheet UUID"
        uuid hotel_id FK "References hotels(id)"
        uuid season_id FK "Composite FK with hotel_id to hotel_seasons"
        int version_number "Version increment (1, 2, 3...)"
        string status "DRAFT, PUBLISHED, ARCHIVED"
        string currency "ISO-4217 (USD, EUR, LKR)"
        uuid published_by FK "References user_profiles(id)"
        timestamptz published_at "Publish timestamp"
    }

    HOTEL_RATE_COMPONENTS {
        uuid id PK "Component UUID"
        uuid rate_sheet_id FK "References hotel_rate_sheets(id)"
        string component_key "HB_DOUBLE_BASE, SINGLE_REDUCTION, etc."
        numeric component_value "Base amount or adjustment"
    }

    HOTEL_RATE_OUTPUTS {
        uuid id PK "Output Tier UUID"
        uuid rate_sheet_id FK "References hotel_rate_sheets(id)"
        string room_type "Single, Double, Triple"
        string meal_plan "BB, HB, FB"
        string rate_category "RED (Lowest), GREEN (Normal), YELLOW (Highest)"
        numeric amount "Numeric price"
        string currency "ISO currency code"
    }

    AGENCY_SPECIAL_RATES {
        uuid id PK "Special Rate UUID"
        uuid agency_id FK "References travel_agencies(id)"
        uuid hotel_id FK "References hotels(id)"
        uuid season_id FK "Composite FK with hotel_id to hotel_seasons"
        int slot_number "Exactly 1, 2, or 3"
        numeric amount "Negotiated amount"
        string currency "ISO currency code"
        date date_in "Check-in validity"
        date date_out "Check-out validity"
        text notes "Commercial negotiation note"
        uuid created_by FK "References user_profiles(id)"
    }
```

---

## 3. Diagram 3: Rate Distribution & Immutable Quote Snapshots

```mermaid
erDiagram
    USER_PROFILES ||--o{ QUOTES : "creates_and_sends"
    TRAVEL_AGENCIES ||--o{ QUOTES : "quoted_agency"
    AGENCY_MARKETS ||--o{ QUOTES : "quoted_market (via composite FK)"

    QUOTES ||--o{ QUOTE_RECIPIENTS : "dispatched_to"
    QUOTES ||--o{ QUOTE_ITEMS : "includes_rooms"
    QUOTES ||--o{ QUOTE_EMAIL_ATTEMPTS : "delivery_log"
    QUOTE_RECIPIENTS ||--o{ QUOTE_EMAIL_ATTEMPTS : "tracks_attempt_for"

    QUOTES {
        uuid id PK "Quote UUID"
        string quote_reference "Human-readable quote code"
        uuid sender_id FK "References user_profiles(id)"
        uuid agency_id FK "References travel_agencies(id)"
        uuid market_id FK "Composite FK with agency_id to agency_markets"
        string recipient_scope "INDIVIDUAL, ENTIRE_MARKET, ENTIRE_AGENCY"
        string quote_lifecycle "DRAFT, DISPATCHED, CANCELLED"
        string email_status "NOT_SENT, QUEUED, PARTIALLY_SENT, SENT, FAILED"
        timestamptz created_at "Creation timestamp"
        timestamptz sent_at "Sent timestamp"
    }

    QUOTE_RECIPIENTS {
        uuid id PK "Recipient Snapshot UUID"
        uuid quote_id FK "References quotes(id)"
        uuid original_member_id FK "References agency_members(id) nullable"
        string original_full_name "Snapshot recipient name"
        string original_email "Frozen recipient email at send time"
        string original_agency_name "Frozen agency name"
        string original_market_name "Frozen market desk"
        string delivery_status "PENDING, SENT, FAILED"
        timestamptz sent_at "Individual delivery timestamp"
    }

    QUOTE_ITEMS {
        uuid id PK "Quote Line Item UUID"
        uuid quote_id FK "References quotes(id)"
        uuid hotel_id FK "References hotels(id)"
        uuid season_id FK "Composite FK with hotel_id to hotel_seasons"
        string hotel_name_snapshot "Frozen hotel property name"
        string season_label_snapshot "Frozen seasonal label"
        string rate_category "RED, GREEN, YELLOW, SPECIAL_1, SPECIAL_2, SPECIAL_3, CUSTOM"
        string room_type_snapshot "e.g. Deluxe Double Room"
        string meal_plan_snapshot "e.g. Half Board (HB)"
        numeric quoted_amount "Frozen final price"
        string currency "Frozen currency (USD, EUR, LKR)"
    }

    QUOTE_EMAIL_ATTEMPTS {
        uuid id PK "Email Log UUID"
        uuid quote_id FK "References quotes(id)"
        uuid recipient_id FK "References quote_recipients(id)"
        int attempt_number "Sequence number"
        string delivery_status "SENDING, SENT, FAILED"
        string provider_message_id "External mail gateway ID"
        text error_message "Detailed error if failed"
        timestamptz attempted_at "Attempt timestamp"
    }
```

---

## 4. Diagram 4: Team Chat, Notifications, Sales Activities & Audit Logs

```mermaid
erDiagram
    USER_PROFILES ||--o{ CHAT_GROUPS : "admin_creates"
    CHAT_GROUPS ||--o{ CHAT_GROUP_MEMBERS : "enrolled_users"
    USER_PROFILES ||--o{ CHAT_GROUP_MEMBERS : "is_member"

    CHAT_GROUPS ||--o{ CHAT_MESSAGES : "contains"
    USER_PROFILES ||--o{ CHAT_MESSAGES : "authors"
    CHAT_GROUP_MEMBERS ||--o{ CHAT_MESSAGES : "sender_enrolled_check (via composite FK)"

    CHAT_MESSAGES ||--o{ CHAT_MESSAGE_ATTACHMENTS : "includes_media"
    CHAT_MESSAGES ||--o{ CHAT_MESSAGE_MENTIONS : "tags_user"
    CHAT_MESSAGES ||--o{ CHAT_READ_RECEIPTS : "tracks_read_by"

    USER_PROFILES ||--o{ SALES_ACTIVITIES : "records"
    TRAVEL_AGENCIES ||--o{ SALES_ACTIVITIES : "linked_agency"
    AGENCY_MARKETS ||--o{ SALES_ACTIVITIES : "linked_market (via composite FK)"
    AGENCY_MEMBERS ||--o{ SALES_ACTIVITIES : "linked_member (via composite FK)"
    SALES_ACTIVITIES ||--o{ SALES_ACTIVITY_ATTACHMENTS : "voice_notes"

    USER_PROFILES ||--o{ NOTIFICATIONS : "recipient_alert"
    USER_PROFILES ||--o{ AUDIT_LOGS : "actor_staff"

    CHAT_GROUPS {
        uuid id PK "Group UUID"
        string name "e.g. General Sales, Management"
        uuid created_by FK "References user_profiles(id) - Must be Admin"
        boolean is_archived "Archive flag"
    }

    CHAT_MESSAGES {
        uuid id PK "Message UUID"
        uuid group_id FK "References chat_groups(id)"
        uuid sender_id FK "References user_profiles(id)"
        text message_text "Content string"
        string message_type "TEXT, AUDIO, IMAGE, SYSTEM"
        timestamptz created_at "Message timestamp"
    }

    SALES_ACTIVITIES {
        uuid id PK "Activity UUID"
        uuid staff_id FK "References user_profiles(id)"
        uuid agency_id FK "References travel_agencies(id)"
        uuid market_id FK "Composite FK with agency_id to agency_markets"
        uuid member_id FK "Composite FK with agency_id to agency_members"
        uuid hotel_id FK "References hotels(id)"
        date activity_date "Date of interaction"
        text notes "Discussion summary"
    }

    SALES_ACTIVITY_ATTACHMENTS {
        uuid id PK "Audio Attachment UUID"
        uuid activity_id FK "References sales_activities(id)"
        string storage_bucket "private bucket name"
        string storage_path "storage object key"
        string mime_type "audio/webm, audio/mp4"
        bigint file_size_bytes "File size in bytes"
        string transcription_language "Selected before transcription"
        text transcription_text "Speech-to-text transcript"
    }

    AUDIT_LOGS {
        uuid id PK "Audit Record UUID"
        uuid actor_id FK "References user_profiles(id)"
        string action "INSERT, UPDATE, DELETE, PUBLISH, GRANT, REVOKE"
        string target_table "Table name affected"
        uuid target_record_id "Record UUID"
        jsonb old_values "Pre-change values"
        jsonb new_values "Post-change values"
        timestamptz timestamp "Event timestamp"
    }
```
