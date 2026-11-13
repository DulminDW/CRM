# RECOMMENDED RATE CALCULATION MODEL
**Window Companies Management System — Architectural Blueprint**  
**Document Code:** `RECOMMENDED_RATE_CALCULATION_MODEL.md`  
**Date:** November 05, 2026  
**Status:** Recommended Technical & Commercial Architecture  

---

## 1. Evaluation of Architectural Options

We evaluated four potential architectural options against the findings in `HOTEL_RATE_RELATIONSHIP_MATRIX.md`:

| Option | Description | Source Feasibility | Operational Verdict |
| :--- | :--- | :---: | :--- |
| **A. Universal Formula** | Single static formula applied to all properties (e.g. SGL = DBL - 10, BB = HB - 10). | **FAILED** | **REJECTED.** Violates 11 out of 12 partner contracts. Mount Randholee uses -$5 in Summer; Thinnai uses -$15; Rivendell uses -$5. |
| **B. Hotel-Specific Rules** | One static formula set per hotel. | **FAILED** | **REJECTED.** Within Mount Randholee, Single delta is -$5 in Summer and -$10 in Winter. Within The Deer Park, Triple delta is +\$45 in 2026 and +\$55 in 2027. |
| **C. Hotel + Season + Market Rules** | Hardcoding rules per `(hotel_id, season_id, market_id)`. | **RISKY** | Fragile and maintenance-heavy. Any tariff amendment requires code changes. |
| **D. Saved Custom Calculation Templates (RECOMMENDED)** | **Dynamic 2-axis delta templates with 5 user-named template slots.** Allows selecting an anchor price (Double HB) and applying configurable deltas, with manual in-cell editing before commit. | **100% COMPLIANT** | **RECOMMENDED.** Matches real hotel pricing structures, empowers sales reps to tailor quotes, and prevents formula rigidity. |

---

## 2. The 5-Slot Custom Calculation Template Architecture

The recommended engine provides **up to FIVE user-named calculation templates** stored in PostgreSQL:
1. `Template 1: Standard Commercial (e.g. "Kandy Circuit Standard")`
2. `Template 2: Luxury Hill Country (e.g. "Nuwara Eliya / Horton Model")`
3. `Template 3: Cultural Triangle (e.g. "Giritale / Polonnaruwa Model")`
4. `Template 4: City Corporate (e.g. "Colombo 03 Business Model")`
5. `Template 5: Custom Agency VIP (e.g. "High Volume Negotiated Desk")`

### Template Data Structure:
```typescript
export interface RateCalculationTemplate {
  id: string;
  template_name: string; // e.g. "Kandy Circuit Standard"
  slot_number: 1 | 2 | 3 | 4 | 5;
  description?: string;

  // Occupancy Adjustments (relative to Double)
  single_occupancy_delta: number;   // e.g. -10
  triple_occupancy_delta: number;   // e.g. +25
  quadruple_occupancy_delta: number;// e.g. +60

  // Meal Plan Adjustments (per occupancy or uniform)
  double_bb_delta: number;          // e.g. -10
  double_fb_delta: number;          // e.g. +15
  single_bb_delta: number;          // e.g. -5
  single_fb_delta: number;          // e.g. +10
  triple_bb_delta: number;          // e.g. -20
  triple_fb_delta: number;          // e.g. +25
  quad_bb_delta: number;            // e.g. -15
  quad_fb_delta: number;            // e.g. +30

  // Metadata
  version_number: number;
  is_active: boolean;
  created_by: string;
}
```

---

## 3. How the User Experience Operates (Step-by-Step)

```
Step 1: User selects Hotel, Season, and Room Type.
Step 2: User selects or activates a Calculation Template (e.g. Template 1).
Step 3: User inputs ONE anchor base price:
        [ Double HB = $120.00 ]
Step 4: System instantaneously calculates the other 11 cells:
        ┌───────────┬─────────┬─────────┬─────────┐
        │ Occupancy │   BB    │   HB    │   FB    │
        ├───────────┼─────────┼─────────┼─────────┤
        │ Single    │ $105.00 │ $110.00 │ $120.00 │
        │ Double    │ $110.00 │ $120.00 │ $135.00 │
        │ Triple    │ $125.00 │ $145.00 │ $170.00 │
        │ Quad      │ $165.00 │ $180.00 │ $210.00 │
        └───────────┴─────────┴─────────┴─────────┘
Step 5: User can MANUALLY OVERRIDE any cell in the grid (e.g. round $105 to $100).
Step 6: User clicks "Save Rate Sheet" or "Proceed to Quote".
```

---

## 4. Key Safety Principles Preserved

1. **Zero Silent Overwriting:** Pre-calculated numbers are displayed in editable input fields. The user has 100% final editorial authority before persisting.
2. **Provenance Tracking:** Ingested rates store original source contract PDF name and page citations in `public.hotel_rate_sheets.notes`.
3. **Database Integrity:** Templates only generate proposals or rate sheet drafts; they never alter immutable historical quotes.

