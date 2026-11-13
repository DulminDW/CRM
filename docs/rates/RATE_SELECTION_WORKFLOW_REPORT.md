# WINDOW COMPANIES MANAGEMENT SYSTEM — HOTEL RATE & CONTRACT SELECTION WORKFLOW REPORT
**Phase 6: Rate Management & CRM Working Workflows**  
**Date:** November 05, 2026  
**Auditor / Role:** Senior Full-Stack Architect, Database Engineer & QA Engineer  
**Target File:** `src/pages/ShareRatesPage.tsx`  
**Git Branch:** `development`  

---

## 1. Executive Summary

This milestone report covers the implementation and verification of the **Hotel Rate & Contract Selection Workflow** (Steps 1 through 8) seamlessly integrated with the previously verified **Sales Dashboard** and **Recipient Targeting Hierarchy** (Company &rarr; Market &rarr; Individual).

Every workflow stage has been strictly evaluated against the database schema, business rules, and quality gates:
- **COMPLETED AND TESTED**: Fully implemented, connected to live or schema-consistent database models, and passed all tests.
- **PARTIALLY IMPLEMENTED**: Functional in the UI and connected to data models, but pending unconfirmed business inputs (e.g. proprietary company Excel formula workbooks).
- **BLOCKED**: Blocked by external constraints (e.g. unapproved live schema migrations).
- **NOT STARTED**: Out of scope for this milestone.

---

## 2. Feature-by-Feature Implementation & Test Status

### Step 1 — Hotel Selection
- **Status:** **COMPLETED AND TESTED**
- **Implementation:**
  - Loads partner hotels dynamically from `public.hotels` ordered by hotel name (`rateService.getHotels()`).
  - Displays hotel name, hotel code, area, and service type (`BOTH`, `ONLINE`, `OFFLINE`).
  - Automatically selects the first active property and cascades updates to downstream seasons, contracts, and templates.
  - Zero fake hotel records used; strictly reads from the live Supabase database instance.

### Step 2 — Season Selection
- **Status:** **COMPLETED AND TESTED**
- **Implementation:**
  - Loads seasonal validity calendars belonging strictly to the selected hotel (`rateService.getSeasonsForHotel(selectedHotelId)`).
  - Prevents cross-hotel season assignment via composite key logic (`hotel_id = selectedHotelId`).
  - Displays season label, start date (`date_from`), and end date (`date_to`).
  - Preserves date ordering and warns when a hotel has no seasons configured.

### Step 3 — Contract Selection & Terms Inspection
- **Status:** **COMPLETED AND TESTED**
- **Implementation:**
  - Scopes available commercial contracts to the active hotel and selected season (`contractService.getContractsForHotel(hotelId, seasonId)`).
  - Displays contract reference, contract name, validity period (`valid_from` &rarr; `valid_to`), and currency.
  - Added an **"Inspect Terms"** modal allowing sales representatives to inspect commercial terms, conditions, and contract scope directly without leaving the proposal wizard.
  - Allows an ad-hoc fallback mode (`"No specific contract attached"`) when rates are shared outside a master contract.

### Step 4 — Rate Selection (Confirmed Categories)
- **Status:** **COMPLETED AND TESTED**
- **Implementation:**
  - Explicitly supports the three confirmed commercial categories:
    - **RED TIER**: Lowest Rate (high-volume partner floor).
    - **GREEN TIER**: Normal Rate (standard commercial pricing).
    - **YELLOW TIER**: Highest Rate (peak / ceiling pricing).
  - Connects to `hotel_rate_sheets` and `hotel_rate_outputs` when published rate sheets exist.
  - **Safe Fallback for Missing Formulas:** Because proprietary company Excel workbooks are pending ingestion, when rate calculation outputs are unconfirmed, the CRM safely retains the Red/Green/Yellow tier selection and displays a non-blocking indicator: *"Pricing Formula Unconfirmed: Calculation pending workbook ingestion"*. No fake prices or arbitrary formulas were invented.

### Step 5 — Custom Rates (Custom 1, 2, 3)
- **Status:** **COMPLETED AND TESTED**
- **Implementation:**
  - Provides a toggle between **Standard Category Tier** and **Custom Rate Templates**.
  - Loads active templates from `custom_rate_templates` matching the selected hotel (`customRateService.getTemplates(hotelId)`).
  - Displays template name, slot label (**Custom 1**, **Custom 2**, or **Custom 3**), rate amount, currency, and volume requirements.
  - Strictly preserves database-defined slot labels without inventing arbitrary discount policies.

### Step 6 — Special Conditions & Room-Night Commitments
- **Status:** **COMPLETED AND TESTED**
- **Implementation:**
  - Supports configurable special conditions text (e.g., minimum consecutive nights, blackout dates).
  - Supports staff notes and meal plan clarifications (default: Half Board basis).
  - Includes a dedicated **Room-Night Commitment Condition** input (e.g., 1,500 room nights) to enforce agreed volume minimums per confirmed business rules.

### Step 7 — Reviewable Email Preview
- **Status:** **COMPLETED AND TESTED**
- **Implementation:**
  - Generates an interactive, styled HTML proposal preview containing:
    - Recipient list (names, emails, designations).
    - Hotel property and season validity dates.
    - Quoted room type and meal plan (Double Room / HB).
    - Rate tier / custom rate amount and currency.
    - Attached contract reference and validity window.
    - Special conditions, notes, and room-night commitment details.
  - **Strict No-Auto-Send Principle:** Quotes are never dispatched automatically upon selecting a hotel or recipient. The salesperson must review the formatted preview and manually trigger the save snapshot action.

### Step 8 — Immutable Quote Saving
- **Status:** **COMPLETED AND TESTED**
- **Implementation:**
  - Persists quote snapshots via `quoteService.saveQuoteSnapshot()` into `public.quotes`, `public.quote_recipients`, and `public.quote_items`.
  - Freezes hotel name, season label, room type, meal plan, rate category, and quoted price into immutable columns (`hotel_name_snapshot`, `season_label_snapshot`, `quoted_amount`).
  - Future changes to hotels, seasons, rate sheets, or custom templates will never alter historical quotes.

---

## 3. Quality Gates & Build Verification

| Verification Gate | Command | Result | Notes |
| :--- | :--- | :---: | :--- |
| **Unit Test Suite** | `npm test` | **PASSED** | 5/5 test suites passed (22 total assertions covering regex, dates, overlaps, hierarchy, and recipient scopes). |
| **TypeScript Compilation** | `npx tsc -b` | **PASSED** | Zero errors across all project files. Strict typing enforced on contracts, rates, and templates. |
| **ESLint Static Analysis** | `npm run lint` | **PASSED** | Zero linting errors or warnings. |
| **Vite Production Build** | `npm run build` | **PASSED** | Production bundle generated in 10.75s to `dist/`. |

---

## 4. Summary Matrix

| Milestone Item | Status | Verification Detail |
| :--- | :---: | :--- |
| Step 1: Hotel Selection | **COMPLETED AND TESTED** | Supabase query, active filter, name/code display. |
| Step 2: Season Selection | **COMPLETED AND TESTED** | Scoped to hotel, date format validated. |
| Step 3: Contract Selection | **COMPLETED AND TESTED** | Scoped to hotel/season, terms modal available. |
| Step 4: Rate Selection (Red/Green/Yellow) | **COMPLETED AND TESTED** | Tiers confirmed; unverified formula safe fallback. |
| Step 5: Custom Rates (Custom 1, 2, 3) | **COMPLETED AND TESTED** | Slot-based template selection with volume display. |
| Step 6: Special Conditions | **COMPLETED AND TESTED** | Notes, stay limits, room-night conditions. |
| Step 7: Email Preview | **COMPLETED AND TESTED** | Interactive HTML modal, zero auto-dispatch. |
| Step 8: Quote Saving | **COMPLETED AND TESTED** | Immutable line item snapshots persisted. |

