# RATE DATABASE FINAL DESIGN & SCHEMA ARCHITECTURE
**Window Companies Management System — Technical Specification**  
**Document Code:** `RATE_DATABASE_FINAL_DESIGN.md`  
**Date:** November 05, 2026  
**Auditor / Roles:** Senior Database Architect, PostgreSQL Engineer, Security Auditor  

---

## 1. Schema Topology & Table Reusability Review

The database architecture has been reviewed to ensure complete support for master contracts, multi-market rate periods, room occupancies, meal plans, color rate tiers, and immutable quote snapshots **without creating redundant or duplicate tables**.

### 1.1 Existing Tables (14 Core Tables from Initial & Draft Migrations)

```
[HOTELS] (Table 6)
   │
   ├─► [HOTEL_SEASONS] (Table 7)
   │      │
   │      ├─► [HOTEL_CONTRACTS] (Migration 000010)
   │      │      └── Scoped to (season_id, hotel_id) via Composite FK
   │      │
   │      ├─► [HOTEL_RATE_SHEETS] (Table 8)
   │      │      │
   │      │      ├─► [HOTEL_RATE_COMPONENTS] (Table 9)
   │      │      │      └── Raw base rates, deductions, supplements
   │      │      │
   │      │      └─► [HOTEL_RATE_OUTPUTS] (Table 10)
   │      │             └── Red / Green / Yellow tier prices per Room/Meal Plan
   │      │
   │      └─► [CUSTOM_RATE_TEMPLATES] (Migration 000010)
   │             └── Negotiated Custom 1, 2, 3 slots with room-night conditions
   │
[TRAVEL_AGENCIES] (Table 3)
   │
   ├─► [AGENCY_MARKETS] (Table 4)
   │      │
   │      └─► [AGENCY_MEMBERS] (Table 5)
   │             └── Scoped to (market_id, agency_id) via Composite FK
   │
   └─► [AGENCY_SPECIAL_RATES] (Table 11)
          └── Agency-specific VIP negotiated slots 1, 2, 3

[QUOTES] (Table 12)
   │
   ├─► [QUOTE_RECIPIENTS] (Table 13)
   │      └── Frozen snapshot of recipient names and emails at send time
   │
   └─► [QUOTE_ITEMS] (Table 14)
          └── Frozen snapshot of hotel, season, rate tier, price, and terms
```

---

## 2. Table-by-Table Capability Assessment

| Entity Requirement | Supported Existing Table | Composite FK Safeguard | Status & Recommendation |
| :--- | :--- | :--- | :--- |
| **Hotel Master Contracts** | `public.hotel_contracts` | `(season_id, hotel_id) -> hotel_seasons(id, hotel_id)` | **Ready in Migration 000010.** Reuses existing table design; no new table required. |
| **Seasonal Validity Periods** | `public.hotel_seasons` | `(id, hotel_id)` composite unique key | **Active in live database.** Strict date checks (`date_to >= date_from`) already active. |
| **Contract Regional Markets** | `public.hotel_rate_sheets` / `hotel_contracts` | Scoped via `notes` or dedicated `market_code` | Can store market segmentation (e.g. The Thinnai Asian vs. European contract books). |
| **Formula Inputs (Reductions / Supplements)** | `public.hotel_rate_components` | `rate_sheet_id -> hotel_rate_sheets(id)` | Supports storing base rate, single reduction, triple supplement, gala dinners. |
| **Color Tier Outputs (Red / Green / Yellow)** | `public.hotel_rate_outputs` | `rate_sheet_id -> hotel_rate_sheets(id)` | Enforces `rate_category IN ('RED', 'GREEN', 'YELLOW')` and meal plans (`RO/BB/HB/FB/AI`). |
| **Custom 1, 2, 3 Templates** | `public.custom_rate_templates` | `(season_id, hotel_id) -> hotel_seasons(id, hotel_id)` | **Ready in Migration 000010.** Enforces `slot_label IN ('Custom 1', 'Custom 2', 'Custom 3')`. |
| **Agency Negotiated Slots** | `public.agency_special_rates` | `(agency_id, hotel_id, season_id, slot_number)` | **Active in live schema.** Dedicated to client-specific agreed pricing. |
| **Immutable Quote Snapshots** | `public.quotes`, `quote_recipients`, `quote_items` | `(market_id, agency_id) -> agency_markets(id, agency_id)` | Fully frozen historical records. Changes to future rates cannot alter sent quotes. |

---

## 3. Database Safety & Integrity Guarantees

1. **Zero Table Duplication:**
   - All proposed features fit strictly into Tables 6 through 14. No placeholder or duplicate tables need to be created.
2. **Referential Hierarchy Integrity:**
   - Composite foreign keys guarantee that a season cannot be paired with the wrong hotel, and a contact member cannot be paired with the wrong travel agency.
3. **Migration Boundaries:**
   - Migrations `20261105000009` and `20261105000010` remain in specification mode. They will only be executed against production Supabase upon explicit administrative instruction.

