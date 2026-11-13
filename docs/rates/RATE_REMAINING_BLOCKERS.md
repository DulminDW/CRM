# RATE REMAINING BLOCKERS & PREREQUISITES
**Window Companies Management System — Pre-Deployment Tracker**  
**Document Code:** `RATE_REMAINING_BLOCKERS.md`  
**Date:** November 05, 2026  
**Status:** Tracking Operational & Business Blockers Prior to Production Migration  

---

## 1. Active Blockers & Prerequisites

| Blocker ID | Classification | Description | Required Action / Owner | Impact on Migration |
| :---: | :--- | :--- | :--- | :--- |
| **BLK-01** | **Owner Authorization** | Formal administrative authorization is required before executing pending database migrations `000009` and `000010` against production Supabase. | Project Owner / Technical Lead to provide explicit written deployment instruction. | **Mandatory Gate.** Migrations cannot run without this sign-off. |
| **BLK-02** | **Staff Credential Provisioning** | Live browser and API verification of non-admin Staff accounts (verifying that staff without `CAN_MANAGE_RATES` cannot modify rate sheets) is currently blocked. | Owner to provision dedicated test Staff credentials (`staff_qa@windowcompanies.com`). | Non-blocking for schema deployment (verified via static RLS audit), but needed for end-to-end multi-role sign-off. |
| **BLK-03** | **Company Rate Calculator Workbook** | Proprietary Excel calculation workbooks detailing the arithmetic conversion from base Double HB rates to Single deductions, BB deductions, and triple supplements are pending ingestion. | Management / Revenue Team to supply company rate sheets. | Non-blocking for database schema (schema safely stores output tiers as well as raw components), but required to automate calculation engine. |

---

## 2. Non-Blockers (Resolved in Pre-Deployment Phase)
- **Schema Conflicts:** None. Verified against live Supabase schema; target tables `hotel_contracts` and `custom_rate_templates` do not collide with existing tables.
- **Rollback Feasibility:** Fully reversible. Rollback scripts tested statically; operations do not drop production data.
- **Client Security:** Verified zero service-role keys exposed in frontend code.

