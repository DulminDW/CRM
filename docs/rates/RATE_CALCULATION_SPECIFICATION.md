# WINDOW COMPANIES MANAGEMENT SYSTEM — RATE CALCULATION SPECIFICATION

**Document Version:** 1.0.0 (Foundation Draft)  
**Date:** November 05, 2026  
**Scope:** Engineering specification for the future rate calculation engine  

---

## 1. Engine Objective

The Rate Calculation Engine will take a hotel's base rate components for a specific season and compute commercial pricing outputs for:
- Room Types: `Single`, `Double`, `Triple`
- Meal Plans: `Bed & Breakfast (BB)`, `Half Board (HB)`, *(Full Board / Room Only if confirmed)*
- Commercial Tiers: `RED` (Lowest), `GREEN` (Normal), `YELLOW` (Highest)

---

## 2. Input Parameters

Every calculation requires an active **Rate Sheet** tied to a validated `(hotel_id, season_id)` tuple.

### Primary Input Vector:
```typescript
interface RateComponentInputs {
  hbDoubleBase: number;       // Base rate for Double room on HB
  singleReduction?: number;   // Deduction for single occupancy
  tripleSupplement?: number;  // Addition for triple occupancy
  bbReduction?: number;       // Deduction for breakfast only
}
```

---

## 3. Calculation Workflow Pipeline (Design State)

```
┌────────────────────────────────┐
│  Input Rate Components         │
│  - HB Double Base              │
│  - Single Reduction            │
│  - Triple Supplement           │
│  - BB Reduction                │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│  Company Mathematical Formula  │ <── [PENDING CONFIRMATION VIA EXCEL]
│  (Evaluates Room & Meal Plans) │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│  Commercial Tier Mapping       │
│  - RED: Lowest rate            │
│  - GREEN: Normal rate          │
│  - YELLOW: Highest rate        │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│  Persistence / Snapshot        │
│  - hotel_rate_outputs          │
│  - Versioned Rate Sheet        │
└────────────────────────────────┘
```

---

## 4. Operational Guardrails

1. **No Fake Values in Quotes:**
   - Until company Excel files are supplied and formulas verified, the system will not auto-generate calculated rate outputs for quotes.
2. **Explicit Operator Overrides:**
   - Operators with `CAN_MANAGE_RATES` or `ADMIN` roles may manually input approved rates into `hotel_rate_outputs` without running the automated calculation engine.
3. **Immutability of Published Sheets:**
   - Once a rate sheet is set to `PUBLISHED`, its components and outputs cannot be modified in place. To alter rates, a new `version_number` must be created in `DRAFT` status.

