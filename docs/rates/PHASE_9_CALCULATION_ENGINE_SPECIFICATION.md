# Phase 9: Calculation Engine Technical Specification
**Window Companies (Pvt) Ltd. — CRM Project**  
**Date:** November 11–12, 2026 (Phase 9)  
**Document Status:** Implementation Complete / Formula Verification Pending

---

## 1. Engine Architecture & Decoupling

The calculation engine is implemented as a pure, testable service in `src/services/rateCalculationService.ts`.

It strictly decouples calculation mechanics from UI state.

```typescript
export interface CalculationInput {
  hotelId: string;
  hotelName: string;
  seasonId: string;
  seasonLabel: string;
  rateCategory: 'RED' | 'GREEN' | 'YELLOW';
  occupancy: 'SINGLE' | 'DOUBLE' | 'TRIPLE';
  mealPlan: 'BB' | 'HB';
  components: HotelRateComponentValues;
  currency?: string;
  isFormulaVerified?: boolean;
}
```

---

## 2. Order of Operations & Arithmetic Derivation

1. **Double HB Base Anchor**:
   $$\text{Subtotal}_1 = R_{\text{HB, Double Base}}$$

2. **Occupancy Adjustment (relative to Double)**:
   - If Single:
     $$\text{Subtotal}_2 = \text{Subtotal}_1 - \Delta_{\text{Single Reduction}}$$
   - If Triple:
     $$\text{Subtotal}_2 = \text{Subtotal}_1 + \Delta_{\text{Triple Supplement}}$$
   - If Double:
     $$\text{Subtotal}_2 = \text{Subtotal}_1$$

3. **Meal Plan Adjustment (relative to HB)**:
   - If BB:
     $$\text{Final Rate} = \text{Subtotal}_2 - \Delta_{\text{BB Reduction}}$$
   - If HB:
     $$\text{Final Rate} = \text{Subtotal}_2$$

4. **Rounding**:
   - Evaluated to 2 decimal places using `Math.round(total * 100) / 100`.

---

## 3. Transparency & Step Breakdown

For every calculation, the engine returns a detailed audit breakdown:
```typescript
export interface StepBreakdown {
  step: string;
  operation: 'BASE' | 'DEDUCTION' | 'SUPPLEMENT';
  amountDelta: number;
  subtotal: number;
  explanation: string;
}
```
If `isFormulaVerified === false`, a clear warning is appended:
*"Formula components for this hotel are pending official company Excel sign-off."*

