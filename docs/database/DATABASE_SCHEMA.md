# DATABASE COMPLETE SCHEMA SPECIFICATION
**WINDOW COMPANIES MANAGEMENT SYSTEM**  
*Company:* Window Companies (Pvt) Ltd.  
*Schema Status:* Target Post-Initialization State (Migrations 000001 through 000015)  
*Date:* November 11, 2026

---

## 1. Schema Architecture Overview

The system uses a partitioned domain model structured into seven functional modules:
1. **User Identity & Access Control** (`user_profiles`, `user_permissions`)
2. **Travel Agency Partner Hierarchy** (`travel_agencies`, `agency_markets`, `agency_members`)
3. **Hotels & Seasonal Calendar** (`hotels`, `hotel_seasons`)
4. **Master Contracts & Document Vault** (`hotel_contracts`, `hotel_contract_seasons`, `hotel_contract_conditions`, `hotel_contract_documents`, `hotel_contract_versions`)
5. **Rate Architecture & Pricing Configuration** (`hotel_rate_sheets`, `hotel_rate_components`, `hotel_rate_outputs`, `hotel_rate_configs`, `custom_rate_templates`, `agency_special_rates`, `rate_calculation_setups`)
6. **Quotes & Rate Sharing History** (`quotes`, `quote_recipients`, `quote_items`, `quote_email_attempts`)
7. **Audit & Bulk Import Logs** (`audit_logs`, `excel_import_history`)

---

## 2. Table Specifications & Constraints

### 2.1 Identity & Authorization

#### `user_profiles`
- `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `full_name VARCHAR(255) NOT NULL`
- `role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'STAFF'))`
- `department VARCHAR(100)`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`

#### `user_permissions`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE`
- `permission_key VARCHAR(50) NOT NULL CHECK (permission_key IN ('CAN_MANAGE_RATES', 'CAN_MANAGE_USERS', 'CAN_CREATE_CHAT_GROUPS'))`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- *Constraints:* `UNIQUE (user_id, permission_key)`

---

### 2.2 Travel Agency Hierarchy

#### `travel_agencies`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `name VARCHAR(255) NOT NULL UNIQUE (name)`
- `code VARCHAR(50)`
- `country VARCHAR(100)`
- `city VARCHAR(100)`
- `phone VARCHAR(50)`
- `email VARCHAR(255)`
- `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))`
- `created_at / updated_at TIMESTAMPTZ`

#### `agency_markets`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `agency_id UUID NOT NULL REFERENCES travel_agencies(id) ON DELETE RESTRICT`
- `market_name VARCHAR(100) NOT NULL`
- `description TEXT`
- *Constraints:* `UNIQUE (agency_id, market_name)`, `UNIQUE (id, agency_id)`

#### `agency_members`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `agency_id UUID NOT NULL REFERENCES travel_agencies(id) ON DELETE RESTRICT`
- `market_id UUID NOT NULL`
- `full_name VARCHAR(255) NOT NULL`
- `email VARCHAR(255) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')`
- `phone VARCHAR(50)`
- `position VARCHAR(100)`
- `member_code VARCHAR(50)`
- `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))`
- *Constraints:*
  - Composite FK: `FOREIGN KEY (market_id, agency_id) REFERENCES agency_markets(id, agency_id) ON DELETE RESTRICT`
  - Unique composite: `UNIQUE (id, agency_id)`
  - Index: `LOWER(email)`

---

### 2.3 Hotels & Seasonal Calendar

#### `hotels`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `hotel_name VARCHAR(255) NOT NULL UNIQUE`
- `hotel_code VARCHAR(50)`
- `area VARCHAR(100)`
- `service_type VARCHAR(20) NOT NULL DEFAULT 'BOTH' CHECK (service_type IN ('ONLINE', 'OFFLINE', 'BOTH'))`
- `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))`

#### `hotel_seasons`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT`
- `season_label VARCHAR(100) NOT NULL`
- `date_from DATE NOT NULL`
- `date_to DATE NOT NULL`
- `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UPCOMING', 'EXPIRED'))`
- *Constraints:*
  - `CHECK (date_to > date_from)` (strictly later, from `000008`)
  - `UNIQUE (hotel_id, season_label)`
  - `UNIQUE (id, hotel_id)` (Composite reference anchor)

---

### 2.4 Contracts & Document Vault

#### `hotel_contracts`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `hotel_id UUID NOT NULL REFERENCES hotels(id)`
- `season_id UUID`
- `contract_reference VARCHAR(100) NOT NULL UNIQUE`
- `contract_name VARCHAR(255) NOT NULL`
- `valid_from DATE NOT NULL`
- `valid_to DATE NOT NULL CHECK (valid_to >= valid_from)`
- `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`
- `currency VARCHAR(3) NOT NULL DEFAULT 'USD'`
- `terms_and_conditions TEXT`
- `document_storage_path VARCHAR(500)`
- `version_number INTEGER NOT NULL DEFAULT 1`
- `created_by UUID NOT NULL REFERENCES user_profiles(id)`
- *Composite FK:* `FOREIGN KEY (season_id, hotel_id) REFERENCES hotel_seasons(id, hotel_id)`

#### `hotel_contract_seasons`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `contract_id UUID NOT NULL REFERENCES hotel_contracts(id) ON DELETE CASCADE`
- `hotel_id UUID NOT NULL`
- `season_id UUID NOT NULL`
- *Composite FK:* `FOREIGN KEY (season_id, hotel_id) REFERENCES hotel_seasons(id, hotel_id)`
- *Constraint:* `UNIQUE (contract_id, season_id)`

#### `hotel_contract_conditions`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `contract_id UUID NOT NULL REFERENCES hotel_contracts(id) ON DELETE CASCADE`
- `condition_title VARCHAR(255) NOT NULL`
- `condition_description TEXT NOT NULL`
- `condition_category VARCHAR(50) NOT NULL DEFAULT 'GENERAL'`
- `is_mandatory BOOLEAN NOT NULL DEFAULT FALSE`
- `is_internal_only BOOLEAN NOT NULL DEFAULT FALSE`
- `display_order INTEGER NOT NULL DEFAULT 1`

#### `hotel_contract_documents`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `contract_id UUID NOT NULL REFERENCES hotel_contracts(id) ON DELETE CASCADE`
- `file_name VARCHAR(255) NOT NULL`
- `file_type VARCHAR(100) NOT NULL`
- `file_size_bytes BIGINT NOT NULL`
- `storage_path VARCHAR(500) NOT NULL`
- `version_number INTEGER NOT NULL DEFAULT 1`
- `uploaded_by UUID NOT NULL REFERENCES user_profiles(id)`

#### `hotel_contract_versions`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `contract_id UUID NOT NULL REFERENCES hotel_contracts(id) ON DELETE RESTRICT`
- `version_number INTEGER NOT NULL`
- `version_label VARCHAR(100) NOT NULL`
- `terms_snapshot TEXT`
- `conditions_snapshot JSONB`
- `effective_from DATE NOT NULL`
- `effective_to DATE NOT NULL`
- `change_summary TEXT`
- `published_by UUID NOT NULL REFERENCES user_profiles(id)`

---

### 2.5 Rate Engine & Pricing Configurations

#### `hotel_rate_configs` (Migration 000014)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `hotel_id UUID NOT NULL REFERENCES hotels(id)`
- `season_id UUID NOT NULL`
- `contract_id UUID REFERENCES hotel_contracts(id)`
- `rate_category VARCHAR(20) NOT NULL CHECK (rate_category IN ('RED', 'GREEN', 'YELLOW'))`
- `currency VARCHAR(3) NOT NULL DEFAULT 'USD'`
- `hb_double_base_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00`
- `single_reduction_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00`
- `triple_supplement_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00`
- `bb_reduction_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00`
- `is_formula_verified BOOLEAN NOT NULL DEFAULT FALSE`
- `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`
- *Composite FK:* `FOREIGN KEY (season_id, hotel_id) REFERENCES hotel_seasons(id, hotel_id)`
- *Constraint:* `UNIQUE (hotel_id, season_id, rate_category, version_number)`

#### `custom_rate_templates` (Migration 000010)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `hotel_id UUID NOT NULL REFERENCES hotels(id)`
- `season_id UUID`
- `slot_label VARCHAR(20) NOT NULL CHECK (slot_label IN ('Custom 1', 'Custom 2', 'Custom 3'))`
- `template_name VARCHAR(255) NOT NULL`
- `rate_amount NUMERIC(12, 2) NOT NULL CHECK (rate_amount >= 0)`
- `room_night_condition INTEGER`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`

#### `rate_calculation_setups` (Migration 000011)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `setup_name VARCHAR(255) NOT NULL`
- `description TEXT`
- `config JSONB NOT NULL`
- `created_by UUID NOT NULL REFERENCES user_profiles(id)`
- `is_archived BOOLEAN NOT NULL DEFAULT FALSE`
- `version_number INTEGER NOT NULL DEFAULT 1`

---

### 2.6 Quotes & Rate Sharing History

#### `quotes` (Extended in Migration 000014)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `quote_reference VARCHAR(50) NOT NULL UNIQUE`
- `sender_id UUID NOT NULL REFERENCES user_profiles(id)`
- `agency_id UUID NOT NULL REFERENCES travel_agencies(id)`
- `market_id UUID`
- `recipient_scope VARCHAR(20) NOT NULL`
- `quote_lifecycle VARCHAR(20) NOT NULL DEFAULT 'DRAFT'`
- `email_status VARCHAR(30) NOT NULL CHECK (email_status IN ('NOT_SENT', 'QUEUED', 'PARTIALLY_SENT', 'SENT', 'FAILED', 'OPENED_IN_EMAIL_APP', 'USER_CONFIRMED_SENT'))`
- `email_subject VARCHAR(255) NOT NULL`
- `email_body_html TEXT NOT NULL`
- `email_body_text TEXT` *(added in 000014)*
- `opened_in_app_at TIMESTAMPTZ` *(added in 000014)*
- `confirmed_by UUID REFERENCES user_profiles(id)` *(added in 000014)*
- `confirmed_at TIMESTAMPTZ` *(added in 000014)*
- `confirmation_notes TEXT` *(added in 000014)*

#### `quote_recipients`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE`
- `original_member_id UUID`
- `original_full_name VARCHAR(255) NOT NULL`
- `original_email VARCHAR(255) NOT NULL`
- `original_agency_name VARCHAR(255) NOT NULL`
- `original_market_name VARCHAR(100)`
- `delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'`

#### `quote_items`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE`
- `hotel_id UUID NOT NULL REFERENCES hotels(id)`
- `season_id UUID NOT NULL`
- `contract_id UUID`
- `contract_reference_snapshot VARCHAR(255)`
- `hotel_name_snapshot VARCHAR(255) NOT NULL`
- `season_label_snapshot VARCHAR(100) NOT NULL`
- `rate_category VARCHAR(50) NOT NULL`
- `quoted_amount NUMERIC(12, 2) NOT NULL`
- `currency VARCHAR(3) NOT NULL DEFAULT 'USD'`

---

### 2.7 Audit & Bulk Import Logs

#### `audit_logs` (Extended in Migrations 000011 & 000012)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `actor_id UUID NOT NULL REFERENCES user_profiles(id)`
- `action VARCHAR(50) NOT NULL` *(includes CALCULATION_SETUP_* and RATE_* actions)*
- `target_type VARCHAR(50) NOT NULL`
- `target_id VARCHAR(100) NOT NULL`
- `details JSONB`
- `ip_address VARCHAR(50)`
- `user_agent TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- *Hardened Trigger:* `trg_enforce_audit_actor` automatically enforces `NEW.actor_id := auth.uid()`.

#### `excel_import_history` (Migration 000015)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `category VARCHAR(50) NOT NULL CHECK (category IN ('HOTELS', 'SEASONS', 'AGENCIES', 'MARKETS', 'MEMBERS'))`
- `file_name VARCHAR(255) NOT NULL`
- `total_rows INTEGER NOT NULL DEFAULT 0`
- `successful_rows INTEGER NOT NULL DEFAULT 0`
- `skipped_rows INTEGER NOT NULL DEFAULT 0`
- `failed_rows INTEGER NOT NULL DEFAULT 0`
- `status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'))`
- `error_summary JSONB DEFAULT '[]'::jsonb`
- `started_by UUID NOT NULL REFERENCES user_profiles(id)`
- `started_at / completed_at TIMESTAMPTZ NOT NULL`

