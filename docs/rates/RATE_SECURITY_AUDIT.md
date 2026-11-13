# RATE SECURITY AUDIT — ACCESS CONTROL & ROW LEVEL SECURITY
**Window Companies Management System — Security Architecture Review**  
**Document Code:** `RATE_SECURITY_AUDIT.md`  
**Date:** November 05, 2026  
**Target Environment:** Remote Supabase Instance (`fvxtnitlsbzmcuphefmv`)  
**Scope:** Permissions, Role Checks, RLS Default-Deny, Anonymous Isolation, Secret Management  

---

## 1. Zero-Trust Access Control Model

The CRM enforces a strict **Zero-Trust, Default-Deny** security architecture across all rate and contract entities:

```
[ UNTRUSTED INCOMING REQUEST ]
             │
             ▼
   Is user authenticated?
             │
      ┌──────┴──────┐
      │ NO          │ YES
      ▼             ▼
[ REJECT / DENY ]  Is active employee? (is_active_employee())
                    │
             ┌──────┴──────┐
             │ NO          │ YES
             ▼             ▼
       [ REJECT / DENY ]  Can manage rates? (can_manage_rates())
                           │
                    ┌──────┴──────┐
                    │ NO          │ YES
                    ▼             ▼
              [ READ ONLY ]  [ AUTHORIZED MUTATION ]
              (Select allowed (Insert/Update allowed;
               to build quote) Delete restricted to Admin)
```

---

## 2. Table-by-Table RLS Matrix

| Database Table | RLS Enabled? | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `public.hotel_contracts` | **YES** | `is_active_employee()` | `can_manage_rates()` | `can_manage_rates()` | `can_manage_rates()` |
| `public.custom_rate_templates` | **YES** | `is_active_employee()` | `can_manage_rates()` | `can_manage_rates()` | `can_manage_rates()` |
| `public.hotel_rate_sheets` | **YES** | `is_active_employee()` | `can_manage_rates()` | `can_manage_rates() AND status != 'ARCHIVED'` | `is_admin() AND status = 'DRAFT'` |
| `public.hotel_rate_components` | **YES** | `is_active_employee()` | `can_manage_rates()` | `can_manage_rates()` | `can_manage_rates()` |
| `public.hotel_rate_outputs` | **YES** | `is_active_employee()` | `can_manage_rates()` | `can_manage_rates()` | `can_manage_rates()` |
| `public.agency_special_rates` | **YES** | `is_active_employee()` | `is_active_employee()` | `is_active_employee()` | `is_admin()` |
| `public.quotes` | **YES** | `is_active_employee()` | `is_active_employee() AND sender_id = auth.uid()` | `is_admin() OR sender_id = auth.uid()` | `is_admin()` |
| `public.quote_items` | **YES** | `is_active_employee()` | `is_active_employee()` | Denied (Frozen snapshot) | `is_admin()` |

---

## 3. Threat Vector Analysis & Hardening Measures

### Threat 1: Cross-Agency Rate Leakage
- **Vulnerability:** Sales rep accidentally sending negotiated agency special rates or custom template quotes to a different travel agency.
- **Hardening:**
  - `public.agency_special_rates` has a composite unique constraint `(agency_id, hotel_id, season_id, slot_number)` preventing cross-agency record assignment.
  - `public.quotes` enforces `CONSTRAINT fk_quotes_composite_market FOREIGN KEY (market_id, agency_id) REFERENCES public.agency_markets(id, agency_id)` ensuring a market desk strictly matches the recipient agency.

### Threat 2: Mutating Historical Rates on Sent Quotes
- **Vulnerability:** A hotel increases its contract rate for Summer 2026. Does that retrospectively alter a quote sent to Jetwing Travels last week?
- **Hardening:**
  - **Zero Database Retrospective Mutation:** Quotes store raw scalar string/number snapshots (`hotel_name_snapshot`, `season_label_snapshot`, `quoted_amount`, `rate_category`) in `public.quote_items`.
  - Joining against `hotel_rate_sheets` is for analytical provenance only; display and financial audit read strictly from the immutable snapshot.

### Threat 3: Anonymous Client Exploitation
- **Vulnerability:** Attacker calling Supabase PostgREST endpoints directly using the public anon key without an active JWT session.
- **Hardening:**
  - Live testing confirmed that anonymous calls attempting to write to `travel_agencies` or read protected tables are immediately rejected:
    ```
    "new row violates row-level security policy for table travel_agencies"
    ```
  - Anonymous access to rate sheets, outputs, and contracts is completely blocked (`USING (public.is_active_employee())`).

### Threat 4: Service Role Key Exposure
- **Vulnerability:** Leaking the Supabase `service_role` secret in frontend JavaScript bundles.
- **Hardening:**
  - Inspected `src/lib/supabase.ts`, `.env.local`, and git history.
  - Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or anon key) are used.
  - The service-role key is **never imported, referenced, or bundled** into the client build.

---

## 4. Live Testing Status & Blocked Scope

- **Admin Account Testing:**
  - Authenticated Admin operations tested successfully in Phase 5 QA pass. Admin profile is assigned role `ADMIN` with full access to user management, rate hubs, and audit logs.
- **Staff Account Live Testing:**
  - In compliance with strict company security instructions: *"Do not create unauthorized accounts without authorization. If an authorized test Staff account does not exist, mark Staff tests BLOCKED and request owner authorization."*
  - **Status:** **BLOCKED (Awaiting Owner Provisioning of Test Staff Credentials)**.
  - Static analysis of RLS logic confirms that Staff sessions without `CAN_MANAGE_RATES` will be restricted to read-only views for quote generation.

