# WINDOW COMPANIES MANAGEMENT SYSTEM — PHASE 6 HOTEL & SEASON MODULE REVIEW

**Review Date:** November 05, 2026  
**Auditor:** Senior Full-Stack Engineer, Database Architect & QA Auditor  
**Scope:** Review and verification of completed Hotel and Season modules as the foundation for Rate Management  
**Target Environment:** Production Supabase Database (`fvxtnitlsbzmcuphefmv`)  

---

## 1. Executive Summary

The Hotel Inventory Management (`/hotels`) and Hotel Season Management (`/seasons`) modules were thoroughly inspected across frontend code, database constraints, Supabase migrations, RLS policies, and automated unit test suites. 

### Core Verdict
The Hotel and Season foundation is **structurally solid, fully synchronized with remote Supabase**, and enforces critical relational invariants (notably composite keys and strict season dates). It is ready to serve as the parent foundation for the upcoming Rate Management module.

---

## 2. Detailed Inspection Matrix

| Module / Component | Mechanism Inspected | Business Rule / Invariant Checked | Verification Status |
|---|---|---|---|
| **Hotels Listing & Search** | `hotelService.getHotels()`, `HotelsPage.tsx` | Searches by name, code, area; filters by channel and status. | **PASS** |
| **Hotel Service Type** | `chk_hotel_service_type` | Enforces `ONLINE`, `OFFLINE`, `BOTH`. Represents commercial distribution channel, NOT physical amenities. | **PASS** |
| **Hotel Deletion Protection** | Foreign Key constraint on `hotel_seasons(hotel_id)` | Hotels with active dependent seasons cannot be deleted (enforced by `ON DELETE RESTRICT`). | **PASS** |
| **Hotel Season Creation** | `seasonService.createSeason()`, `HotelSeasonsPage.tsx` | Mandatory `hotel_id`, unique composite `(hotel_id, season_label)`. | **PASS** |
| **Strict Season Dates** | DB Migration `000008` & `chk_season_dates` | `date_to > date_from` strictly enforced in database and UI. Same-day and inverted dates rejected. | **PASS** |
| **Season Overlap Advisory** | `seasonService.detectSeasonOverlaps()` | Evaluates existing season intervals; displays a non-blocking advisory banner without prohibiting creation. | **PASS** |
| **Hotel-Season URL Sync** | `useSearchParams` (`?hotelId=...`) | Season page dynamically filters and sets active hotel context when navigated from Hotel card. | **PASS** |
| **Composite Key Foundations** | `uq_hotel_season_composite (id, hotel_id)` | Enables downstream rate tables (`hotel_rate_sheets`, `agency_special_rates`) to strictly enforce that a rate sheet references the hotel's *own* season. | **PASS** |
| **Row Level Security (RLS)** | Tables `hotels` & `hotel_seasons` | Anonymous read returns `[]`, anonymous insert fails with `42501`. Active employees have SELECT; Admins and `CAN_MANAGE_RATES` holders have write privileges. | **PASS** |

---

## 3. Existing Limitations & Known Gaps

1. **Physical Facilities vs. Commercial Channels:**
   - As documented in Phase 4 and re-verified here, `service_type` (`ONLINE/OFFLINE/BOTH`) represents sales distribution channels. Physical hotel amenities (e.g. Pool, Spa, Wi-Fi) do not currently exist in the database schema. This does not block Rate Management.
2. **Dedicated Staff Test Account:**
   - Staff testing in the live browser remains marked as `BLOCKED` awaiting company authorization to create a secondary dummy staff user in the Supabase Dashboard.
3. **Draft Rates Tables Existence in Database:**
   - While tables `hotel_rate_sheets`, `hotel_rate_components`, and `hotel_rate_outputs` were included in the initial schema migration (`20261104000001_initial_schema.sql`), their operational frontend services, calculation logic, and versioning UI have not yet been built.

---

## 4. Risks Affecting Rate Management

1. **Risk of Cross-Hotel Season Association:**
   - *Mitigation:* The database already possesses `CONSTRAINT uq_hotel_season_composite UNIQUE (id, hotel_id)`. Rate sheet tables MUST reference `(season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id)` to prevent Hotel A from accidentally using Hotel B's season.
2. **Risk of Unverified Calculation Formulas:**
   - If calculations (e.g., HB Double Base $\to$ Single Reduction) are hardcoded without actual company Excel workbooks, quotes could produce inaccurate financial figures.
   - *Mitigation:* Phase 6 strictly flags formulas as unconfirmed until verified from actual company Excel sheets.

---

## 5. Recommended Actions

1. Preserve all existing Hotel and Season table schemas, composite unique keys, and check constraints.
2. Build Rate Management on top of the existing `hotel_id` and `season_id` composite hierarchy.
3. Keep season overlap as a non-blocking advisory warning.

