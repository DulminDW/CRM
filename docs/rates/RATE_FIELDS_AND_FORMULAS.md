# WINDOW COMPANIES MANAGEMENT SYSTEM — RATE FIELDS AND FORMULAS SPECIFICATION

**Document Version:** 1.0.0 (Foundation Draft)  
**Status Date:** November 05, 2026  
**Scope:** Field inventory, rate components, confirmed vs. unconfirmed formulas  

---

## 1. Classification Standard

In strict accordance with Phase 6 instructions, all rate elements are classified under one of four unambiguous categories:
- **[A] Verified from Company Documents:** Supported by official files in the repository. *(None currently, as no Excel files exist in the workspace).*
- **[B] Existing Project Requirements:** Explicitly documented in `WINDOW_COMPANIES_CRM_COMPLETE_PROJECT_HANDOVER.md` or existing database architecture.
- **[C] Inferred Technical Recommendations:** Standard engineering best practices designed for safety, precision, and version control.
- **[D] Unconfirmed Business Decisions:** Assumptions or common industry formulas that **must NOT** be implemented without company confirmation.

---

## 2. Rate Component Field Inventory

| Field Name | Category | Data Type | Business Meaning | Source / Reference | Confirmation Status |
|---|---|---|---|---|---|
| **HB Double Base** | `[B]` | `NUMERIC(12, 2)` | The foundation rate for a Double room on Half Board basis. Serves as the primary anchor for rate derivation. | Handover §15, Whiteboard notes | **CONFIRMED KEY / UNCONFIRMED VALUE** |
| **Single Reduction** | `[B]` | `NUMERIC(12, 2)` | Reduction amount applied when a room is booked for single occupancy instead of double. | Handover §15, Whiteboard notes | **CONFIRMED KEY / UNCONFIRMED VALUE** |
| **Triple Supplement** | `[B]` | `NUMERIC(12, 2)` | Additional charge applied when a room is booked for triple occupancy. | Handover §15, Whiteboard notes | **CONFIRMED KEY / UNCONFIRMED VALUE** |
| **BB Reduction** | `[B]` | `NUMERIC(12, 2)` | Reduction amount applied when deducting dinner to convert from Half Board (HB) to Bed & Breakfast (BB). | Handover §15, Whiteboard notes | **CONFIRMED KEY / UNCONFIRMED VALUE** |
| **Rate Categories** | `[B]` | `ENUM` | `RED` (Lowest), `GREEN` (Normal), `YELLOW` (Highest) commercial pricing tiers. | Handover §7.1, §16.1 | **CONFIRMED MAPPING** |
| **Currency** | `[B]` | `VARCHAR(3)` | ISO 4217 Currency Code (default: `USD`). | Handover §7.3 | **CONFIRMED DEFAULT** |
| **Version Number** | `[C]` | `INTEGER` | Monotonically incrementing integer tracking monthly rate revisions (`v1, v2, ...`). | Database Architecture §2.3 | **CONFIRMED ARCHITECTURE** |
| **Rate Sheet Status** | `[C]` | `VARCHAR(20)` | Workflow lifecycle status: `DRAFT`, `PUBLISHED`, `ARCHIVED`. | Database Architecture §2.3 | **CONFIRMED ARCHITECTURE** |

---

## 3. Formula Analysis & Verification Register

### Formula 1: Double Room on Half Board (Base Rate)
- **Expression:** $\text{Double}_{\text{HB}} = \text{HB Double Base}$
- **Classification:** `[B] Confirmed Project Requirement`
- **Inputs:** `HB Double Base`
- **Expected Output:** Price for Double occupancy on HB meal plan.
- **Status:** **CONFIRMED BY DEFINITION** (Anchor value).

### Formula 2: Single Room Calculation
- **Hypothetical Expression 1:** $\text{Single}_{\text{HB}} = \text{Double}_{\text{HB}} - \text{Single Reduction}$
- **Hypothetical Expression 2:** $\text{Single}_{\text{HB}} = \frac{\text{Double}_{\text{HB}}}{2} - \text{Single Reduction}$
- **Classification:** `[D] Unconfirmed Business Decision`
- **Status:** **NOT CONFIRMED.** Neither formula will be hardcoded into the calculation engine until the company provides their official Excel workbook demonstrating the exact cell formula.

### Formula 3: Triple Room Calculation
- **Hypothetical Expression 1:** $\text{Triple}_{\text{HB}} = \text{Double}_{\text{HB}} + \text{Triple Supplement}$
- **Hypothetical Expression 2:** $\text{Triple}_{\text{HB}} = \text{Double}_{\text{HB}} \times 1.5 + \text{Triple Supplement}$
- **Classification:** `[D] Unconfirmed Business Decision`
- **Status:** **NOT CONFIRMED.** Must be verified from source Excel files.

### Formula 4: Bed & Breakfast (BB) Meal Plan Conversion
- **Hypothetical Expression 1:** $\text{Room}_{\text{BB}} = \text{Room}_{\text{HB}} - \text{BB Reduction}$
- **Hypothetical Expression 2:** $\text{Room}_{\text{BB}} = \text{Room}_{\text{HB}} - (\text{BB Reduction} \times \text{Occupancy})$
- **Classification:** `[D] Unconfirmed Business Decision`
- **Status:** **NOT CONFIRMED.** Must be verified whether reduction is per room or per person.

---

## 4. Rate Output Matrix Structure

When a rate sheet is finalized, it should produce a matrix of room types, meal plans, and rate tiers:

| Room Type | Meal Plan | Category RED (Lowest) | Category GREEN (Normal) | Category YELLOW (Highest) |
|---|---|---|---|---|
| **Single** | BB | *Pending Confirmation* | *Pending Confirmation* | *Pending Confirmation* |
| **Single** | HB | *Pending Confirmation* | *Pending Confirmation* | *Pending Confirmation* |
| **Double** | BB | *Pending Confirmation* | *Pending Confirmation* | *Pending Confirmation* |
| **Double** | HB | $\text{Base}_{\text{RED}}$ | $\text{Base}_{\text{GREEN}}$ | $\text{Base}_{\text{YELLOW}}$ |
| **Triple** | BB | *Pending Confirmation* | *Pending Confirmation* | *Pending Confirmation* |
| **Triple** | HB | *Pending Confirmation* | *Pending Confirmation* | *Pending Confirmation* |

