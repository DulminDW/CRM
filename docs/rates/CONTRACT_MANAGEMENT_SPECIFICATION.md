# WINDOW COMPANIES MANAGEMENT SYSTEM — CONTRACT MANAGEMENT SPECIFICATION

**Document Version:** 1.0.0  
**Date:** November 05, 2026  
**Scope:** Master hotel contracts, season scoping, validity dates, and terms handling  

---

## 1. Business Concept

A **Hotel Contract** represents a formal legal and commercial agreement established with a partner hotel property (e.g. Randoli, Beragala, Horton Heights, H.S.H.).
- It sets forth master pricing agreements, payment terms, cancellation penalties, and validity dates.
- Contracts can apply company-wide across all seasons, or be scoped specifically to an individual seasonal validity window (`season_id`).

---

## 2. Data Structure (`hotel_contracts`)

```sql
CREATE TABLE IF NOT EXISTS public.hotel_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
    season_id UUID,
    contract_reference VARCHAR(100) NOT NULL UNIQUE,
    contract_name VARCHAR(255) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    terms_and_conditions TEXT,
    document_storage_path VARCHAR(500),
    version_number INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_contracts_composite_season FOREIGN KEY (season_id, hotel_id) 
        REFERENCES public.hotel_seasons(id, hotel_id) ON DELETE RESTRICT,
    CONSTRAINT chk_contract_dates CHECK (valid_to >= valid_from),
    CONSTRAINT chk_contract_status CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'))
);
```

---

## 3. Workflow & Usage in Rate Sharing

1. **Contract Establishment:** Operators with `CAN_MANAGE_RATES` create contracts in the *Partner Contracts* tab under `/rates`.
2. **Contract Selection in Rate Sharing:** During the rate sharing wizard (`/share-rates`), operators can link a specific active contract to ensure recipient travel agents receive the authoritative agreement reference.
3. **Auditability:** Modifications to contracts record the author ID and increment version numbers.

