# WINDOW COMPANIES MANAGEMENT SYSTEM — RATE DATABASE ARCHITECTURE

**Document Date:** November 05, 2026  
**Architect:** Senior Database Architect & Full-Stack Security Engineer  
**Scope:** Rate management database schema design, referential integrity, and versioning rules  

---

## 1. Architectural Principles

The rate management schema is designed around five core principles:
1. **Hotel & Season Referential Integrity:** A rate sheet cannot reference a season belonging to another hotel. This is guaranteed through PostgreSQL **composite foreign keys**.
2. **Immutability of Published Rates:** Once a rate sheet is `PUBLISHED`, it cannot be altered in place. Adjustments require creating a new `DRAFT` version with an incremented `version_number`.
3. **Decoupling Inputs from Outputs:** Raw calculation components (`hotel_rate_components`) are isolated from generated/approved outputs (`hotel_rate_outputs`).
4. **Isolated Special Rates:** Agency-specific negotiated special rates (`agency_special_rates`) are decoupled from standard hotel rate sheets, ensuring VIP deals do not pollute master pricing.
5. **Auditing & Traceability:** All rate sheet creation, modification, and publication events write immutable audit records into `public.audit_logs`.

---

## 2. Table Inventory & Relationships

```
┌─────────────────────────────────┐
│          public.hotels          │
│   id (PK), name, service_type   │
└───────────────┬─────────────────┘
                │ 1 : N
                ▼
┌─────────────────────────────────┐
│      public.hotel_seasons       │
│   id, hotel_id (Composite PK)   │
│   date_from, date_to (Strict)   │
└───────────────┬─────────────────┘
                │ 1 : N (Composite FK: season_id, hotel_id)
                ▼
┌─────────────────────────────────┐
│    public.hotel_rate_sheets     │
│   id (PK), hotel_id, season_id  │
│   version_number, status        │
└───────────────┬─────────────────┘
                │
        ┌───────┴────────────────────────┐
        │ 1 : N                          │ 1 : N
        ▼                                ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│ public.hotel_rate_components  │ │   public.hotel_rate_outputs   │
│ rate_sheet_id (FK), key, val  │ │ rate_sheet_id, room, meal,    │
│ (HB Double Base, Reductions)  │ │ rate_category, amount, curr   │
└───────────────────────────────┘ └───────────────────────────────┘
```

---

## 3. Rate Sheet Lifecycle State Machine

```
      ┌───────────┐
      │   DRAFT   │ <──── Created by Admin or Staff (CAN_MANAGE_RATES)
      └─────┬─────┘       (Editable: components & outputs may change)
            │
            │ Publish Action (Validated by Admin)
            ▼
      ┌───────────┐
      │ PUBLISHED │ <──── Live active pricing for Quotes & Sales
      └─────┬─────┘       (LOCKED: Read-only; cannot be mutated)
            │
            │ Replaced by new version publication
            ▼
      ┌───────────┐
      │ ARCHIVED  │ <──── Historical preservation
      └───────────┘       (Never deleted; preserved for audit)
```

---

## 4. Special Rates Design (Slots 1, 2, 3)

The handover specifies that agencies can receive custom negotiated special rates (Special Rate 1, Special Rate 2, Special Rate 3).
- **Table:** `public.agency_special_rates`
- **Key Relationships:**
  - `agency_id REFERENCES public.travel_agencies(id)`
  - `(season_id, hotel_id) REFERENCES public.hotel_seasons(id, hotel_id)` (Composite FK)
- **Constraint:**
  - `CONSTRAINT chk_special_rate_slot CHECK (slot_number IN (1, 2, 3))`
  - `CONSTRAINT uq_agency_hotel_season_slot UNIQUE (agency_id, hotel_id, season_id, slot_number)`
- This prevents assigning multiple Special Rate 1s to the same agency for the same hotel season.

