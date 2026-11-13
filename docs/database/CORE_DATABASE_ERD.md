# WINDOW COMPANIES CRM — CORE DATABASE ERD (MODULES 1–3)

**Document Version:** 1.0.0  
**Status Date:** November 02, 2026  
**Classification:** Internal Technical Architecture Diagram  
**Primary Source of Truth:** `docs/database/001_initial_schema_DRAFT.sql`

---

## 1. Core Entity-Relationship Diagram (Modules 1, 2, and 3)

The following Mermaid diagram visualizes the primary keys, foreign keys, and composite relationships for the 7 core tables:
- `user_profiles`
- `user_permissions`
- `travel_agencies`
- `agency_markets`
- `agency_members`
- `hotels`
- `hotel_seasons`

```mermaid
erDiagram
    %% MODULE 1: EMPLOYEES & SYSTEM ACCESS
    user_profiles {
        uuid id PK "Matches auth.users(id)"
        varchar full_name "Employee Name (>= 2 chars)"
        varchar role "ADMIN | STAFF"
        boolean is_active "Account status"
        timestamptz created_at
        timestamptz updated_at
    }

    user_permissions {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "REFERENCES user_profiles(id) ON DELETE CASCADE"
        varchar permission_key "CAN_MANAGE_RATES | CAN_MANAGE_USERS | CAN_CREATE_CHAT_GROUPS"
        uuid granted_by FK "REFERENCES user_profiles(id) ON DELETE RESTRICT"
        timestamptz granted_at
    }

    %% MODULE 2: TRAVEL AGENCY HIERARCHY
    travel_agencies {
        uuid id PK "gen_random_uuid()"
        varchar name UK "Agency Name (Unique)"
        varchar code "Agency code"
        varchar country "Country"
        varchar city "City"
        varchar phone "Phone"
        varchar email "Email"
        varchar status "ACTIVE | INACTIVE"
        timestamptz created_at
        timestamptz updated_at
    }

    agency_markets {
        uuid id PK "gen_random_uuid()"
        uuid agency_id FK "REFERENCES travel_agencies(id) ON DELETE RESTRICT"
        varchar market_name "Market Desk Name (Unique per agency)"
        text description "Internal notes"
        timestamptz created_at
        timestamptz updated_at
    }

    agency_members {
        uuid id PK "gen_random_uuid()"
        uuid agency_id FK "REFERENCES travel_agencies(id) ON DELETE RESTRICT"
        uuid market_id FK "Part of composite FK to agency_markets"
        varchar full_name "Contact Name (>= 2 chars)"
        varchar email "Validated format regex"
        varchar phone "Phone number"
        varchar position "Designation / Role"
        varchar member_code "External code"
        varchar status "ACTIVE | INACTIVE"
        timestamptz created_at
        timestamptz updated_at
    }

    %% MODULE 3: HOTELS & SEASONAL CALENDAR
    hotels {
        uuid id PK "gen_random_uuid()"
        varchar hotel_name UK "Property Name (Unique)"
        varchar hotel_code "Property code"
        varchar area "Location / Area"
        varchar service_type "ONLINE | OFFLINE | BOTH"
        varchar status "ACTIVE | INACTIVE"
        timestamptz created_at
        timestamptz updated_at
    }

    hotel_seasons {
        uuid id PK "gen_random_uuid()"
        uuid hotel_id FK "REFERENCES hotels(id) ON DELETE RESTRICT"
        varchar season_label "Season Label (Unique per hotel)"
        date date_from "Start date"
        date date_to "End date (date_to >= date_from)"
        varchar status "ACTIVE | UPCOMING | EXPIRED"
        timestamptz created_at
        timestamptz updated_at
    }

    %% RELATIONSHIPS
    user_profiles ||--o{ user_permissions : "holds capabilities (user_id)"
    user_profiles ||--o{ user_permissions : "grants capabilities (granted_by)"

    travel_agencies ||--o{ agency_markets : "partitions into regional desks (1:N)"
    travel_agencies ||--o{ agency_members : "employs contacts (1:N)"
    agency_markets ||--o{ agency_members : "contains contacts via composite FK (market_id, agency_id)"

    hotels ||--o{ hotel_seasons : "defines seasonal calendars (1:N)"
```

---

## 2. Downstream Linkage Architecture (Modules 4 & 5 Integration)

The core tables established above integrate seamlessly into the remaining modules via composite foreign keys:

```mermaid
erDiagram
    hotels ||--o{ hotel_rate_sheets : "owns rate sheets (hotel_id)"
    hotel_seasons ||--o{ hotel_rate_sheets : "composite FK (season_id, hotel_id)"
    
    travel_agencies ||--o{ agency_special_rates : "negotiated for agency (agency_id)"
    hotels ||--o{ agency_special_rates : "hotel property (hotel_id)"
    hotel_seasons ||--o{ agency_special_rates : "composite FK (season_id, hotel_id)"

    travel_agencies ||--o{ quotes : "recipient agency (agency_id)"
    agency_markets ||--o{ quotes : "composite FK (market_id, agency_id)"
    user_profiles ||--o{ quotes : "dispatched by (sender_id)"

    hotels ||--o{ quote_items : "quoted hotel (hotel_id)"
    hotel_seasons ||--o{ quote_items : "composite FK (season_id, hotel_id)"
```
