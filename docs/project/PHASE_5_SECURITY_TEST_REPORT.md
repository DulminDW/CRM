# WINDOW COMPANIES CRM — PHASE 5 SECURITY TEST REPORT

**Audit Date:** November 05, 2026 (Phase 5 Stabilization)  
**Security Engineer:** Lead Security & Database Architecture Auditor  
**Scope:** PostgreSQL Row Level Security (RLS), Supabase Auth Policies, Network Boundary Probes  
**Target Environment:** Production Supabase Instance (`fvxtnitlsbzmcuphefmv`)  

---

## 1. Executive Summary

A comprehensive security audit of WINDOW COMPANIES CRM was executed. 100% of application tables (all 26 tables) have Row Level Security enabled. Unauthenticated / anonymous attempts to read or mutate domain data fail with standard RLS violation errors (`42501`) or return empty datasets (`[]`), preventing any data leakage.

---

## 2. Row Level Security Policy Matrix

| Table Name | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
|---|---|---|---|---|---|
| `public.user_profiles` | **YES** | `is_active_employee()` | Admin Trigger / Admin only | Admin only (self-role change denied) | Denied |
| `public.user_permissions` | **YES** | `is_active_employee()` | Admin only (`is_admin()`) | Admin only (`is_admin()`) | Admin only (`is_admin()`) |
| `public.travel_agencies` | **YES** | `is_active_employee()` | `is_active_employee()` | `is_active_employee()` | `is_admin()` |
| `public.agency_markets` | **YES** | `is_active_employee()` | `is_active_employee()` | `is_active_employee()` | `is_admin()` |
| `public.agency_members` | **YES** | `is_active_employee()` | `is_active_employee()` | `is_active_employee()` | `is_admin()` |
| `public.hotels` | **YES** | `is_active_employee()` | `is_admin()` / Rates Manager | `is_admin()` / Rates Manager | `is_admin()` |
| `public.hotel_seasons` | **YES** | `is_active_employee()` | `can_manage_rates()` | `can_manage_rates()` | `is_admin()` |
| Remaining 19 Tables | **YES** | Default-deny / Employee | Permission Gated | Permission Gated | Admin only |

---

## 3. Direct PostgREST API Penetration Probes

Probes were conducted against the live remote Supabase PostgREST endpoints using anonymous headers:

1. **Anonymous Read Probes:**
   - `GET /rest/v1/user_profiles?select=*` $\longrightarrow$ `HTTP 200 []` (0 rows leaked).
   - `GET /rest/v1/travel_agencies?select=*` $\longrightarrow$ `HTTP 200 []` (0 rows leaked).
   - `GET /rest/v1/agency_markets?select=*` $\longrightarrow$ `HTTP 200 []` (0 rows leaked).
   - `GET /rest/v1/agency_members?select=*` $\longrightarrow$ `HTTP 200 []` (0 rows leaked).
   - `GET /rest/v1/hotels?select=*` $\longrightarrow$ `HTTP 200 []` (0 rows leaked).
   - `GET /rest/v1/hotel_seasons?select=*` $\longrightarrow$ `HTTP 200 []` (0 rows leaked).
2. **Anonymous Mutation & Escalation Probes:**
   - `POST /rest/v1/user_permissions` $\longrightarrow$ `HTTP 401 (42501 new row violates row-level security policy)`.
   - `POST /rest/v1/travel_agencies` $\longrightarrow$ `HTTP 401 (42501 new row violates row-level security policy)`.
   - `POST /rest/v1/hotels` $\longrightarrow$ `HTTP 401 (42501 new row violates row-level security policy)`.
   - `POST /rest/v1/hotel_seasons` $\longrightarrow$ `HTTP 401 (42501 new row violates row-level security policy)`.
   - `UPDATE /rest/v1/user_profiles SET role='ADMIN'` $\longrightarrow$ `HTTP 200 []` (0 rows updated; role remains intact).
   - `DELETE /rest/v1/travel_agencies` $\longrightarrow$ `HTTP 200 []` (0 rows deleted).

---

## 4. Secrets & Frontend Security Hygiene

- **`.env.local` Isolation:** Strictly ignored by Git; zero secret keys or database passwords committed.
- **Client Key Safety:** Only public/anon keys (`VITE_SUPABASE_PUBLISHABLE_KEY`) are present in frontend bundles; zero `service_role` keys exist in client code.
- **GoTrue Auth Configuration:** Public email signup remains disabled (`disable_signup: true`), guaranteeing external users cannot register CRM accounts.

