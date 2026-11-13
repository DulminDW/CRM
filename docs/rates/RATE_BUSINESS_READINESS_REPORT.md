# RATE BUSINESS READINESS REPORT
**Window Companies Management System — Business Analysis & Operational Audit**  
**Document Code:** `RATE_BUSINESS_READINESS_REPORT.md`  
**Date:** November 05, 2026  
**Auditor / Role:** Senior Systems Architect & Business Analyst  

---

## 1. Executive Summary

This business readiness review evaluates the operational, contractual, and pricing maturity of the Window Companies Management System prior to live deployment. 

While the **technical architecture** is robust (scoring **CONDITIONAL GO** with zero schema conflicts, strong RLS, and immutable quote snapshots), **business readiness** requires formal sign-offs on proprietary formulas, contract storage, and tax treatment before enabling automated tariff calculations.

---

## 2. Business Dimension Breakdown: Known vs. Unknown

### 2.1 Rate Calculation Readiness

| Pricing Element | Confirmed Business Rules | Unresolved / Unknown Business Decisions |
| :--- | :--- | :--- |
| **Base Rate (HB Double)** | Confirmed as the standard commercial baseline in initial whiteboards and partner contracts. | Whether Double HB is universal base across all 12 hotels, or if properties like Pearl Grand start from Room Only (RO). |
| **Single Occupancy (SGL)** | Handled as a reduction from Double in conversations. | **Unconfirmed deduction formula.** Mount Randholee uses \$15, Serenique uses \$10, Rivendell uses flat matrix (\$35 SGL vs \$40 DBL). |
| **Triple Occupancy (TPL)** | Quoted higher than Double to cover extra guest/meals. | **Unconfirmed supplement formula.** Increases by \$15 on BB, but up to \$40 on HB/FB depending on hotel. |
| **Bed & Breakfast (BB)** | Quoted lower than Half Board. | **Unconfirmed deduction formula.** Dinner supplement varies from \$5 to \$15 per person depending on hotel tier. |
| **Currency** | USD is the primary commercial contract currency across all 12 properties. LKR is listed in Mount Randholee & Manarala. | Exchange rate mechanism when invoicing in LKR (Fixed monthly rate vs. Central Bank daily spot rate). |
| **Tax Inclusivity / Exclusivity** | Disclosed per hotel in contracts (Randoli/Rivendell inclusive; Beragala/Stone House exclusive). | Whether CRM quotes should dynamically compute and add 18% VAT + 2.5% SSCL on exclusive hotels, or quote net. |
| **Pricing Units (PR vs. PP)** | Rooms are Per Room Per Night (PRPN); Gala Dinners & Perahera festival tickets are Per Person (PP). | Rules for automatically multiplying Gala Dinner PP rates by room occupancy in composite quote totals. |
| **Rounding Rules** | Rounding not specified in source contracts. | Nearest whole dollar (\$115.00) vs. exact cents (\$114.75). |

---

### 2.2 Contract Management Readiness

| Contract Element | Status | Operational Details & Gaps |
| :--- | :---: | :--- |
| **Yearly Hotel Contracts** | **CONFIRMED** | Master agreements signed annually with partner hotels. Stored separately in `public.hotel_contracts`. |
| **Contract Validity Boundaries** | **CONFIRMED** | Varies widely by hotel: standard seasonal (Nov–Apr / May–Oct), calendar year (Jan–Dec), or forward multi-year (2027–2028). |
| **Hotel-Specific Commercial Terms** | **CONFIRMED** | Cancellation release periods, driver accommodation (FOC bus driver + guide room \$30–\$40), check-in/out hours. |
| **Contract Document Storage** | **PARTIAL** | Field `document_storage_path` exists in schema. Supabase Storage bucket `hotel-contracts` needs formal bucket creation and RLS. |
| **Contract Terms Inspection** | **CONFIRMED & TESTED** | Implemented in `/share-rates`: sales reps can inspect commercial terms directly during quote configuration. |
| **Contract Version History** | **CONFIRMED** | Tracked via `version_number` integer in `hotel_contracts`. |
| **Contract Expiry Notifications** | **UNRESOLVED** | Notification rules (e.g., alert 30 days prior to contract expiration) not yet planned or scheduled. |

---

### 2.3 Custom Rate Template Readiness (Custom 1, 2, 3)

| Custom Slot Element | Status | Current Scope & Unresolved Rules |
| :--- | :---: | :--- |
| **Three Dedicated Slots** | **CONFIRMED** | `Custom 1`, `Custom 2`, and `Custom 3` slots confirmed and enforced by check constraint in `custom_rate_templates`. |
| **Volume Commitment** | **CONFIRMED** | Supports minimum room-night conditions (e.g., 1,500 room nights) and date windows. |
| **Permissions** | **CONFIRMED** | Managed by staff with `CAN_MANAGE_RATES` or Admin. |
| **Template Reusability Policy** | **UNRESOLVED** | Need owner decision: Are Custom 1-3 templates global per hotel, or can they be restricted to specific agency markets? |
| **Approval Thresholds** | **CONFIRMED** | No admin pre-approval required for salesperson custom slot entry. |

---

### 2.4 Special Rates Readiness (Agency Negotiated Slots 1, 2, 3)

| Special Rate Element | Status | Implementation Details |
| :--- | :---: | :--- |
| **Agency Binding** | **CONFIRMED** | Strictly bound to `agency_id` in `public.agency_special_rates`. Not general hotel rates. |
| **Three Slots (1, 2, 3)** | **CONFIRMED** | Enforced by check constraint `slot_number IN (1, 2, 3)` and composite unique key `(agency_id, hotel_id, season_id, slot_number)`. |
| **Attributes Tracked** | **CONFIRMED** | Amount, currency, room type, meal plan, `date_in`, `date_out`, notes, created_by, timestamps. |
| **Admin Pre-Approval** | **CONFIRMED** | Explicitly NOT required; sales reps can enter negotiated VIP rates during conversations. |
| **Cross-Hotel Scope** | **UNRESOLVED** | Can one agency negotiate multiple sets of Slots 1-3 across different hotels simultaneously? (Schema supports it; business policy needs confirmation). |

---

## 3. Business Readiness Summary

| Readiness Aspect | Status Classification |
| :--- | :---: |
| **Technical Architecture & Data Integrity** | **READY (CONDITIONAL GO)** |
| **Rate Selection & Proposal Dispatch UI** | **READY (COMPLETED & TESTED)** |
| **Recipient Targeting & Deduplication** | **READY (COMPLETED & TESTED)** |
| **Automated Formula Calculation Engine** | **PENDING EXCEL WORKBOOK INGESTION** |
| **Live Database Migrations** | **AWAITING OWNER AUTHORIZATION** |

