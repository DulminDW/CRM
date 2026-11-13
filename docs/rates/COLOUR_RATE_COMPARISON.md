# COLOUR RATE COMPARISON — RED, GREEN, YELLOW TIERS
**Window Companies Management System — Rate Pricing Architecture**  
**Document Code:** `COLOUR_RATE_COMPARISON.md`  
**Date:** November 05, 2026  
**Primary Source:** `WINDOW_COMPANIES_CRM_COMPLETE_PROJECT_HANDOVER.md` (Section 7) & `All_Hotels_All_Markets_Rate_Sheets.pdf`  

---

## 1. Executive Definition & Tier Semantics

In the Window Companies sales model, standard commercial pricing is organized into three distinct, mutually exclusive color classes:

| Rate Tier | Meaning / Definition | Commercial Application | Price Multiplier / Relationship |
| :---: | :--- | :--- | :--- |
| **RED** | **LOWEST RATE** | Bottom-floor rate for high-volume partners, long-standing travel agency relationships, or large commitments. | Floor price (Highest agency margin, lowest hotel margin). |
| **GREEN** | **NORMAL RATE** | Standard commercial market rate dispatched to default travel agencies and standard bookings. | Standard contracted baseline. |
| **YELLOW** | **HIGHEST RATE** | Ceiling / peak rate for ad-hoc agencies, low-volume partners, or short-notice bookings. | Premium tier above standard. |

---

## 2. Business Rules & Enforcement Guarantees

### 2.1 Mutual Exclusivity (Strict CRM Rule)
- **Only ONE colour may be selected per individual rate-sharing action.**
- The CRM interface strictly prohibits selecting two or three colours simultaneously.
- When generating an email quote or PDF proposal, the line items reflect only the chosen tier:
  - If **RED** is selected &rarr; Proposal displays RED tier figures only.
  - If **GREEN** is selected &rarr; Proposal displays GREEN tier figures only.
  - If **YELLOW** is selected &rarr; Proposal displays YELLOW tier figures only.

### 2.2 Accessibility & Label Integrity
- In compliance with Section 7.1 of the handover specification, every UI component and generated email must present textual labels alongside visual color cards:
  - `"RED TIER — LOWEST RATE"`
  - `"GREEN TIER — NORMAL RATE"`
  - `"YELLOW TIER — HIGHEST RATE"`
- Colors must never be the sole visual differentiator.

### 2.3 Status of Physical Color Rate Sheet Files
- **Fact Finding:** In `All_Hotels_All_Markets_Rate_Sheets.pdf` (58 pages), the contracts contain base contractual matrices (e.g. SGL/DBL/TPL across BB/HB/FB).
- Separate standalone color documents ("RED rate sheet", "GREEN rate sheet", "YELLOW rate sheet") were referenced as supplementary commercial pricing sheets.
- **System Behavior in Absence of Uploaded Color Spreadsheets:**
  - The CRM preserves the tier selector (RED/GREEN/YELLOW).
  - When a rate sheet with verified `hotel_rate_outputs` exists in the database, the exact dollar amount for that tier is injected.
  - When no sheet has been uploaded, the system marks the quote as `[RED/GREEN/YELLOW Tier - Calculation Pending Formula Confirmation]`, preventing arbitrary numerical assumptions.

---

## 3. Structural Comparison: Contract Master vs. Colour Tiers

| Aspect | Master Yearly Contract | Colour Rate Sheet (RED/GREEN/YELLOW) |
| :--- | :--- | :--- |
| **Document Purpose** | Legal & commercial agreement signed with hotel. | Sales proposal tier shared with travel agencies. |
| **Scope** | Complete property inventory, terms, policies, full year. | Specific selected room type, season, and price tier. |
| **Recipient** | Stored internally for CRM reference. | Sent to travel agency contacts / market desks. |
| **Complexity** | 2 to 8 pages of legal clauses, driver policies, gala dinner rates. | Single clean proposal card or PDF rate voucher. |
| **Versioning** | Contract Version (v1, v2) upon formal amendment. | Rate Sheet Version (v1.0, v1.1) tied to publishing status. |

---

## 4. Verification Check
- Verified in [`src/pages/ShareRatesPage.tsx`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/src/pages/ShareRatesPage.tsx):
  - State `selectedCategory` accepts only `'RED' | 'GREEN' | 'YELLOW'`.
  - Radio-card buttons enforce exclusive state mutation.
  - Email generator dynamically formats the exact selected tier name and warning notice if unverified.

