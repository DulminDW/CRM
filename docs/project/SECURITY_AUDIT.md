# WINDOW COMPANIES CRM — SECURITY AUDIT & THREAT MATRIX

**Document Version:** 2.0.0  
**Classification:** Enterprise Security Audit & Zero-Trust Verification  

---

## 1. Security Baseline

- **Public Signup:** Permanently disabled (`disable_signup: true`). All employee accounts must be provisioned or invited by an Administrator.
- **Row Level Security:** 100% table coverage across all 26 application tables.
- **Search Path Isolation:** All `SECURITY DEFINER` functions (`is_admin`, `is_active_employee`, `can_manage_rates`, `handle_admin_auth_user`) enforce `SET search_path = public, pg_temp`.
- **Secret Key Hygiene:** Zero `service_role` keys exist in client code. `.env.local` is strictly excluded by `.gitignore`.

---

## 2. Threat Vector Assessment & Mitigations

| Threat Vector | Mitigation Strategy | Live Verification Status |
|---|---|---|
| **Impersonation / Open Signup** | Remote Auth `enable_signup = false` pushed via config | **VERIFIED** |
| **Unconfirmed Admin Account** | Trigger checks `email_confirmed_at IS NOT NULL` | **VERIFIED** |
| **Case Manipulation Attack** | Trigger matches `lower(trim(email)) = 'techwindow@gmail.com'` | **VERIFIED** |
| **Self-Promotion to Admin** | RLS policy prevents updating own `role` or `is_active` | **VERIFIED** |
| **Arbitrary Permission Grant** | Only Admins can insert/update in `user_permissions` | **VERIFIED** |
| **Rate Tampering** | Rate tables require `can_manage_rates()` for mutation | **VERIFIED** |
| **Cross-Agency Quote Leak** | Foreign key constraints and member scopes enforced | **VERIFIED** |
| **Anonymous Data Scraping** | All 26 tables filter anonymous queries to 0 rows | **VERIFIED** |

