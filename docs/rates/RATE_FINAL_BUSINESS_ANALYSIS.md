# RATE FINAL BUSINESS ANALYSIS
**Window Companies Management System — Final Rate Calculation & Rules Analysis**  
**Document Code:** `RATE_FINAL_BUSINESS_ANALYSIS.md`  
**Date:** November 05, 2026  
**Status:** Complete Source Verification & Business Specification  

---

## 1. What the Original Source Documents Explicitly Provide

Based on direct examination of:
1. `All_Hotels_All_Markets_Rate_Sheets.pdf` (58 pages, 12 partner hotels)
2. `WINDOW COMPANIES CRM.pdf` (8 pages, core system blueprint)
3. Handover specification `WINDOW_COMPANIES_CRM_COMPLETE_PROJECT_HANDOVER.md`

### Confirmed Source Facts:
- **Contract Matrices:** Hotels provide explicit rate matrices containing Room Categories (Deluxe, Superior, Villa, etc.) cross-referenced against Occupancy (Single, Double, Triple, Quadruple) and Meal Plans (BB, HB, FB).
- **Explicit Base Figures:** Contract rates are stated as net prices in USD (or LKR where specified).
- **Date-Based Supplements:**
  - Perahera Season: $15–$20 per person per night (Kandy properties).
  - Peak / Festive Season: $10–$20 per room per night (20 Dec – 10 Jan).
  - August Summer Supplement: $10 per room per night.
- **Mandatory Gala Dinner Supplements:** Christmas Eve and New Year’s Eve compulsory dinners ($15–$35 per person depending on base meal plan).
- **Extra Bed & Child Policies:** Extra bed pricing is contracted separately (e.g., $10 net per bed per night, bed only).
- **Tiers (RED / GREEN / YELLOW):**
  - RED = Lowest rate (high-volume partner floor rate).
  - GREEN = Normal rate (standard market baseline).
  - YELLOW = Highest rate (premium / ad-hoc booking ceiling).
  - Strict mutual exclusivity: only one tier may be quoted per distribution.

---

## 2. Which Rates Can Be Derived Mathematically

When an authorized user enters **Double HB** as an anchor base price:
- **Single HB:** Derived by subtracting a configured Single Deduction (e.g., -$10).
- **Triple HB:** Derived by adding a configured Triple Supplement (e.g., +$25).
- **Quadruple HB:** Derived by adding a configured Quad Supplement (e.g., +$50).
- **BB Column:** Derived from each room occupancy row by applying the configured BB adjustment (e.g., -$10 per room or -$5 per person).
- **FB Column:** Derived from each room occupancy row by applying the configured FB adjustment (e.g., +$15 per room or +$10 per person).

---

## 3. Which Calculations Are Only Suggested Patterns (Non-Universal)

The analysis confirms **NO SINGLE UNIVERSAL FORMULA APPLIES ACROSS ALL HOTELS**:
1. **Single Deductions:** Vary between -$5 (Mount Randholee Summer, Rivendell) and -$15 (The Thinnai).
2. **Triple Supplements:** Vary between +$15 (Rivendell) and +$55 (The Deer Park).
3. **Meal Plan Adjustments:** Step amounts differ between summer and winter even for the *same hotel*.
4. **Per-Person vs. Per-Room Scaling:** Meal plans often scale with guest count (Triple guests receive 3 lunches, making Triple FB higher than Double FB).

**System Conclusion:** Universal hardcoding is strictly forbidden. The system must provide flexible user-created calculation setups.

---

## 4. Which Rules Remain Unknown / Unresolved

- **Excel Macro Dependencies:** Exact proprietary spreadsheets used by internal sales directors for special agency tiers have not been uploaded.
- **Tax Inclusivity:** Some contracts quote "Net including all taxes", while others quote "Exclusive of 18% VAT, SSCL & TDL".
- **Special Rate 1, 2, 3 Floor Limits:** Minimum margin safeguards for ad-hoc custom quotes remain pending owner determination.

---

## 5. User-Created Optional Saved Calculation Setups

In accordance with owner guidance:
- **No Predefined System Templates:** Users are not forced into rigid predefined template buckets.
- **No Arbitrary 5-Template Ceiling:** Users may create as many custom setups as required for different regions or hotel categories.
- **Completely Optional:** Sales staff can calculate rates with custom in-place rules and save the rate sheet without saving a reusable setup.
- **Deep-Copy Isolation:** Applying a saved setup creates a decoupled copy in the current working session. Editing a setup never modifies previously published rate sheets.

---

## 6. Audit Trail & Governance Architecture

All rate operations generate immutable audit records:
- `CALCULATION_SETUP_CREATED` / `UPDATED` / `APPLIED` / `ARCHIVED`
- `RATE_CELL_MANUALLY_OVERRIDDEN` (recording actor, cell key, previous calculated value, and override value)
- `RATE_CELL_RESET_TO_AUTO`
- `RATE_SHEET_SAVED` / `PUBLISHED`
- Append-only integrity enforced at the database policy layer.

