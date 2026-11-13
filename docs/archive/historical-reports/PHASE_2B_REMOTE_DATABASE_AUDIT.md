# WINDOW COMPANIES CRM — PHASE 2B REMOTE DATABASE AUDIT

**Audit Date:** November 04, 2026  
**Status:** SCHEMA ABSENT / PENDING DEPLOYMENT AUTHORIZATION  
**Target:** Connected Supabase Remote Project  

---

## 1. Remote PostgreSQL Schema Inspection

A thorough inspection of the remote Supabase PostgreSQL database was conducted via the application's connected interface:

| Object / Verification Item | Remote Status | Notes |
|---|---|---|
| `public.user_profiles` | **DOES NOT EXIST** | HTTP 404 / relation not found (`PGRST205`) |
| `public.user_permissions` | **DOES NOT EXIST** | HTTP 404 / relation not found (`PGRST205`) |
| 26 Domain Tables | **DOES NOT EXIST** | None of the 26 normalized schema tables have been applied |
| Foreign Key `user_profiles.id -> auth.users(id)` | **DOES NOT EXIST** | Pending schema deployment |
| Helper Functions (`is_admin`, etc.) | **DOES NOT EXIST** | Pending migration deployment |
| Row Level Security (RLS) | **NOT YET CONFIGURED** | Tables do not exist yet on remote instance |
| Supabase Auth Service | **OPERATIONAL (HTTP 200)** | Health endpoint active and responsive |

---

## 2. Automated Migration Tooling Inspection

1. **Supabase MCP Server:**
   - Plugin is installed, but requires user sign-in to connect to the Supabase Management API.
2. **Supabase CLI (`npx supabase` v3.0.0):**
   - Supabase CLI is available in the environment.
   - CLI commands querying the remote project (e.g. `npx supabase projects list`) require an access token (`AccessTokenRequiredError`).
3. **Automated Migration Capability:**
   - To deploy migrations completely automatically without manual SQL copying into the dashboard, Antigravity requires the Supabase plugin connection (via the card below) or a linked CLI session.

---

## 3. Migration Plan Readiness

The migration files have been verified and corrected locally:
- `docs/database/001_initial_schema_DRAFT.sql`: Corrected with `pgcrypto`/`uuid-ossp` and explicit `auth.users(id)` foreign key constraint.
- `docs/database/002_auth_rls_DRAFT.sql`: **Marked SUPERSEDED (Will NOT be applied)**.
- `docs/database/003_phase2b_auth_and_schema.sql`: Hardened idempotent RLS and helper functions ready to apply following 001.
