# WINDOW COMPANIES MANAGEMENT SYSTEM — RATE DATABASE DATA DICTIONARY

**Date:** November 05, 2026  
**Scope:** Data dictionary for Module 4: Rate Architecture & Special Rates  

---

### Table: `public.hotel_rate_sheets`
Master versioned pricing schedules.

| Column | Type | Nullable | Default | References | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY | Unique identifier for the rate sheet. |
| `hotel_id` | `UUID` | NO | - | `hotels(id)` | Associated partner hotel. |
| `season_id` | `UUID` | NO | - | `(season_id, hotel_id) -> hotel_seasons` | Composite FK to hotel seasons. |
| `version_number` | `INTEGER` | NO | `1` | - | Incrementing revision number. |
| `status` | `VARCHAR(20)`| NO | `'DRAFT'` | - | Lifecycle status: `DRAFT`, `PUBLISHED`, `ARCHIVED`. |
| `currency` | `VARCHAR(3)` | NO | `'USD'` | - | ISO currency code (3 letters). |
| `notes` | `TEXT` | YES | `NULL` | - | Operational notes or season caveats. |
| `created_by` | `UUID` | NO | - | `user_profiles(id)` | Author of the rate sheet. |
| `published_by`| `UUID` | YES | `NULL` | `user_profiles(id)` | Admin who published the sheet. |
| `published_at`| `TIMESTAMPTZ`| YES| `NULL` | - | Timestamp of publication. |
| `created_at` | `TIMESTAMPTZ`| NO | `CURRENT_TIMESTAMP` | - | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| NO | `CURRENT_TIMESTAMP` | - | Last modification timestamp. |

---

### Table: `public.hotel_rate_components`
Input components used in hotel rate calculations.

| Column | Type | Nullable | Default | References | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY | Unique component identifier. |
| `rate_sheet_id`| `UUID` | NO | - | `hotel_rate_sheets(id) ON DELETE CASCADE`| Parent rate sheet. |
| `component_key`| `VARCHAR(50)`| NO| - | - | Parameter key (`HB_DOUBLE_BASE`, `SINGLE_REDUCTION`, etc.). |
| `component_value`| `NUMERIC(12, 2)`| NO| `0.00` | - | Input numeric amount. |
| `description`| `VARCHAR(255)`| YES| `NULL` | - | Human-readable explanation. |

---

### Table: `public.hotel_rate_outputs`
Pre-calculated or manually verified room prices by category tier.

| Column | Type | Nullable | Default | References | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY | Unique rate output record. |
| `rate_sheet_id`| `UUID` | NO | - | `hotel_rate_sheets(id) ON DELETE CASCADE`| Parent rate sheet. |
| `room_type` | `VARCHAR(100)`| NO| - | - | Room classification (`Single`, `Double`, `Triple`). |
| `meal_plan` | `VARCHAR(20)` | NO| - | - | Meal code (`RO`, `BB`, `HB`, `FB`, `AI`). |
| `rate_category`| `VARCHAR(20)`| NO| - | - | Commercial tier: `RED`, `GREEN`, `YELLOW`. |
| `amount` | `NUMERIC(12, 2)`| NO| - | - | Unit price. |
| `currency` | `VARCHAR(3)` | NO | `'USD'` | - | ISO currency code. |

---

### Table: `public.agency_special_rates`
Negotiated VIP rates assigned to travel agencies.

| Column | Type | Nullable | Default | References | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | `gen_random_uuid()` | PRIMARY KEY | Unique special rate identifier. |
| `agency_id` | `UUID` | NO | - | `travel_agencies(id)` | Beneficiary travel agency. |
| `hotel_id` | `UUID` | NO | - | `hotels(id)` | Target hotel property. |
| `season_id` | `UUID` | NO | - | `(season_id, hotel_id) -> hotel_seasons` | Composite FK to hotel season. |
| `slot_number` | `INTEGER` | NO | - | - | Special rate slot: `1`, `2`, or `3`. |
| `special_price`| `NUMERIC(12, 2)`| NO| - | - | Negotiated price. |
| `date_in` | `DATE` | YES | `NULL` | - | Optional validity start date. |
| `date_out` | `DATE` | YES | `NULL` | - | Optional validity end date. |
| `notes` | `TEXT` | YES | `NULL` | - | Context or justification for the special rate. |
| `created_by` | `UUID` | NO | - | `user_profiles(id)` | Sales staff who created the special rate. |
| `created_at` | `TIMESTAMPTZ`| NO | `CURRENT_TIMESTAMP` | - | Creation timestamp. |

