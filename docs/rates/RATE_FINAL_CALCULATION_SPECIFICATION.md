# RATE FINAL CALCULATION SPECIFICATION
**Window Companies Management System — Technical Engine Specification**  
**Document Code:** `RATE_FINAL_CALCULATION_SPECIFICATION.md`  
**Date:** November 05, 2026  

---

## 1. Engine Core Interface

```typescript
export interface RateCalculationSetupConfig {
  anchorRowId: string;       // Default: 'DBL'
  anchorMealId: string;      // Default: 'HB'
  currency: string;          // Default: 'USD'
  decimalPrecision: number;  // Default: 2
  roomRows: RoomRowConfig[];
  mealColumns: MealPlanColumnConfig[];
  occupancyAdjustments: Record<string, AdjustmentRule>;
  mealAdjustments: Record<string, AdjustmentRule>;
}
```

## 2. Mathematical Derivation Hierarchy

1. **Anchor Entry:** User provides value for Anchor Cell `(anchorRowId, anchorMealId)`.
2. **Occupancy Row Anchor Determination:**
   $$R_{\text{occupancy}, \text{anchorMeal}} = R_{\text{anchor}} \pm \Delta_{\text{occupancy}}$$
   - If Type is `FIXED`: $\Delta = V_{\text{fixed}}$
   - If Type is `PERCENTAGE`: $\Delta = \frac{R_{\text{anchor}} \times V_{\text{percent}}}{100}$
3. **Meal Column Derivation:**
   $$R_{\text{row}, \text{meal}} = R_{\text{row}, \text{anchorMeal}} \pm \Delta_{\text{meal}}$$
   - If Scope is `PER_ROOM`: $\Delta = V_{\text{meal}}$
   - If Scope is `PER_PERSON`: $\Delta = V_{\text{meal}} \times \text{OccupancyPax}$

## 3. Override Isolation Guarantee

- Manual overrides take absolute precedence over calculated figures.
- When an override is applied, the calculated value is retained in `calculatedValue` for traceability and audit.
- Changing the anchor or adjustments recalculates only non-overridden cells.
- Users can click **Auto** on any overridden cell to reset it back to dynamic calculation.

