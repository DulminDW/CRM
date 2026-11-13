# RATE OWNER DECISIONS REQUIRED
**Window Companies Management System — Stakeholder Action Items**  
**Document Code:** `RATE_OWNER_DECISIONS_REQUIRED.md`  
**Date:** November 05, 2026  
**Owner / Audience:** Managing Director, Commercial Director, Technical Lead  

---

## 1. Actionable Decision Registry

Prior to activating automated rate calculations and deploying migrations `000009` and `000010` to the live database, executive decisions are required on the following items:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   EXECUTIVE DECISION REGISTRY                          │
├─────┬─────────────────────────────────────┬────────────────────────────┤
│ ID  │ Decision Topic                      │ Recommended Choice         │
├─────┼─────────────────────────────────────┼────────────────────────────┤
│ D-01│ Migration Deployment Approval       │ Approve for Scheduled Run  │
│ D-02│ Rate Ingestion Method               │ Direct Rate Sheet Upload   │
│ D-03│ Sri Lankan Tax Passthrough Policy   │ Quote Net with Tax Notes   │
│ D-04│ Custom Template Sharing Scope       │ Hotel-Wide with Volume Lock│
│ D-05│ Currency & Exchange Rate Sourcing   │ Fixed Monthly Selling Rate │
│ D-06│ Staff Testing Credential Provision  │ Create staff_qa Test User  │
└─────┴─────────────────────────────────────┴────────────────────────────┘
```

---

## 2. Detailed Decision Descriptions

### Decision D-01: Production Migration Deployment Authorization
- **Question:** Do you authorize running `20261105000009_rate_management_foundation.sql` and `20261105000010_contracts_and_custom_rate_templates.sql` against the live remote Supabase instance (`fvxtnitlsbzmcuphefmv`) following a pre-deployment backup?
- **Impact:** Enables the `hotel_contracts` and `custom_rate_templates` tables and partial single-published rate indexes.
- **Recommended Action:** **APPROVE**. Both migrations have passed static and live RLS security audits with zero table conflicts.

### Decision D-02: Rate Calculation Engine vs. Direct Output Upload
- **Question:** Should the CRM calculate Single, Double, Triple, and BB prices automatically using formulas, or should staff upload/enter verified pricing outputs per tier directly?
- **Options:**
  - **Option A (Recommended):** Enter/upload verified output tables directly per hotel/season into `hotel_rate_outputs`. Guarantees 100% pricing accuracy without relying on unconfirmed arithmetic formulas.
  - **Option B:** Build an automated calculation engine after the management team supplies the corporate Excel calculation workbook.
- **Recommended Action:** **OPTION A for Phase 6**, transitioning to Option B once Excel sheets are provided.

### Decision D-03: Tax Display Policy on Quotes (VAT & SSCL)
- **Question:** How should quotes display taxes for hotels where rates are exclusive of taxes (e.g. Grand Beragala, Highland Stone House)?
- **Options:**
  - **Option A (Recommended):** Display the contracted net rate and include standard legal tax terms: *"Rates exclusive of 18% VAT, 2.5% SSCL, and 10% Service Charge"*. (Matches hotel contract terms).
  - **Option B:** Dynamically compute gross total (+20.5% combined tax) in the quote line item.
- **Recommended Action:** **OPTION A**. Prevents currency rounding discrepancies and aligns with hotel contracts.

### Decision D-04: Custom Rate Template Scope
- **Question:** Are Custom 1, Custom 2, and Custom 3 templates available to all travel agencies, or should a template be lockable to a specific market desk?
- **Recommended Action:** Maintain hotel-wide availability with minimum room-night volume requirements enforced on the quote.

### Decision D-05: Staff Test Account Provisioning
- **Question:** Authorization to provision a test staff account (`staff_qa@windowcompanies.com`) to complete multi-role live browser testing.
- **Recommended Action:** **APPROVE**. Enables complete verification of staff permission restrictions without touching production admin credentials.

