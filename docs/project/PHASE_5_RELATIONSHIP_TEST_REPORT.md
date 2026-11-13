# WINDOW COMPANIES CRM — PHASE 5 RELATIONSHIP INTEGRITY REPORT

**Date:** November 05, 2026 (Phase 5 Stabilization)  
**Classification:** Database Referential Integrity & Hierarchy Audit  
**Scope:** Travel Agency Hierarchy & Hotel Inventory Relationships  

---

## 1. Domain Hierarchy Matrix

The CRM architecture strictly enforces two fundamental multi-tier hierarchies:

### Hierarchy 1: Agency Commercial Contacts
$$\text{Travel Agency (Level 1)} \xrightarrow{\text{1 : N}} \text{Agency Markets (Level 2)} \xrightarrow{\text{1 : N}} \text{Agency Members (Level 3)}$$

### Hierarchy 2: Property Seasonal Pricing
$$\text{Hotels (Master Property Inventory)} \xrightarrow{\text{1 : N}} \text{Hotel Seasons (Seasonal Validity Periods)}$$

---

## 2. Referential Integrity Constraint Verification

| Constraint Identifier | Table | Type | Enforcement Rule | Verification Result |
|---|---|---|---|---|
| `uq_agency_name` | `travel_agencies` | Unique Key | Unique agency name across CRM | **VERIFIED** |
| `uq_agency_market` | `agency_markets` | Composite Unique | `(agency_id, market_name)` | **VERIFIED** (permits "India" under Jetwing and Walkers) |
| `fk_agency_members_agency` | `agency_members` | Foreign Key | `agency_id REFERENCES travel_agencies(id) RESTRICT` | **VERIFIED** |
| `fk_agency_members_composite_market` | `agency_members` | Composite FK | `(market_id, agency_id) REFERENCES agency_markets(id, agency_id) RESTRICT` | **VERIFIED** (prohibits cross-agency market assignment) |
| `uq_hotel_name` | `hotels` | Unique Key | Unique partner hotel name | **VERIFIED** |
| `chk_hotel_service_type` | `hotels` | Check Constraint | `service_type IN ('ONLINE', 'OFFLINE', 'BOTH')` | **VERIFIED** |
| `uq_hotel_season` | `hotel_seasons` | Composite Unique | `(hotel_id, season_label)` | **VERIFIED** |
| `chk_season_dates` | `hotel_seasons` | Check Constraint | `date_to > date_from` (Migration 000008) | **VERIFIED** (strictly rejects same-day & inverted dates) |

---

## 3. Parent-Child Cascade & Count Integrity

1. **Market Deletion Protection:**
   - Attempting to delete a market that contains members is rejected by PostgreSQL foreign-key constraint `fk_agency_members_composite_market`.
2. **Agency Deletion Protection:**
   - Attempting to delete an agency that contains markets is rejected by `fk_agency_markets_agency`.
3. **Dynamic Child Aggregation:**
   - Agency cards compute and display live counts of child markets and contact members.
   - Hotel cards compute and display live counts of child seasons.
4. **Historical Record Preservation:**
   - Data lifecycle guidelines prioritize deactivation (`status = 'INACTIVE'`) over deletion, guaranteeing that quote history and audit trails remain permanently intact.

