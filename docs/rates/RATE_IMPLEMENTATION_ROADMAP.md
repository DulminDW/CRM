# RATE IMPLEMENTATION ROADMAP
**Window Companies Management System — Post-Audit Execution Sequence**  
**Document Code:** `RATE_IMPLEMENTATION_ROADMAP.md`  
**Date:** November 05, 2026  
**Auditor / Roles:** Senior Engineering Manager & Product Architect  

---

## 1. Roadmap Overview & Timeline Phasing

```
                  RATE MANAGEMENT IMPLEMENTATION ROADMAP
                                     │
   ┌─────────────────────────────────┴─────────────────────────────────┐
   ▼                                                                   ▼
PHASE 6A: HARDENED PRE-DEPLOYMENT                       PHASE 6B: RATE CATALOG ACTIVATION
(Completed & Verified)                                  (Target: Post-Authorization)
─────────────────────────────────                       ─────────────────────────────────
• Sales Dashboard Integration                           • Production Migrations 000009 & 000010
• 3-Tier Recipient Targeting                            • Contract PDF Document Upload to Storage
• Contract & Terms Inspection                           • Initial Rate Sheet Entry for 12 Hotels
• Safe Fallbacks for Formulas                           • Staff Multi-Role Browser Testing
• Migration Safety Audit & Checklists                   • End-to-End Proposal Dispatch
                                     │
                                     ▼
                      PHASE 6C: FORMULA ENGINE & ANALYTICS
                      (Target: Q1 2027)
                      ────────────────────────────────────
                      • Corporate Excel Tariff Parser
                      • Automated Meal/Room Calculations
                      • Rate Expiry Background Triggers
                      • Proposal Acceptance Analytics
```

---

## 2. Phase-by-Phase Breakdown

### Phase 6A: Rate Foundation & Proposal Workflow (CURRENT STATUS: COMPLETED)
- **Delivered Capabilities:**
  - Sales Dashboard prominent "Send Hotel Rates" action.
  - Recipient selection hierarchy: Entire Company &rarr; Selected Markets &rarr; Selected Individuals.
  - Inline "+ Add New Contact" modal with duplicate email warnings and instant selection.
  - Hotel property & seasonal calendar binding (12 hotels, scoped seasons).
  - Commercial contract selection with "Inspect Terms" modal.
  - Rate tier cards (RED = Lowest, GREEN = Normal, YELLOW = Highest).
  - Custom templates (Custom 1, 2, 3) with room-night volume commitments.
  - Reviewable email preview dialog with strict zero-auto-send enforcement.
  - Immutable quote snapshot saving into PostgreSQL.

### Phase 6B: Live Schema Deployment & Data Activation (NEXT IMMEDIATE PHASE)
- **Prerequisites:** Owner approval on `RATE_OWNER_DECISIONS_REQUIRED.md`.
- **Action Items:**
  1. Take full database backup via Supabase pg_dump.
  2. Execute migration `20261105000009_rate_management_foundation.sql`.
  3. Execute migration `20261105000010_contracts_and_custom_rate_templates.sql`.
  4. Create `hotel-contracts` storage bucket with authenticated RLS.
  5. Provision `staff_qa@windowcompanies.com` and run authenticated Staff test pass.
  6. Ingest initial master contracts for the 12 partner hotels from `All_Hotels_All_Markets_Rate_Sheets.pdf`.

### Phase 6C: Automated Calculation Engine (FUTURE EXTENSION)
- **Prerequisites:** Receipt of corporate Excel calculation workbooks.
- **Action Items:**
  1. Build formula parser mapping Base Double HB to Single deduction, Triple supplement, and BB reduction.
  2. Automate Sri Lankan tax computation (18% VAT + 2.5% SSCL).
  3. Implement contract expiration notifications (30-day email alerts to commercial managers).

