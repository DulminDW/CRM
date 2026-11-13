# WINDOW COMPANIES CRM — AUTHENTICATION & ACCESS CONTROL GUIDE

**Document Version:** 2.0.0  
**Classification:** Technical Architecture & Operational Guide  

---

## 1. Authentication Architecture

- **Identity Provider:** Supabase Auth (GoTrue).
- **Application Authorization:** Controlled via PostgreSQL records in `public.user_profiles` and `public.user_permissions`.
- **Zero LocalStorage Roles:** Roles and permissions are never stored as authority in `localStorage`. The server session and database RLS dictate true access.
- **Client Service:** Centrally managed in `src/services/auth.ts` and `src/contexts/AuthContext.tsx`.

---

## 2. Protected Route System

Managed via `src/components/common/ProtectedRoute.tsx`:

- **Unauthenticated Users:** Redirected immediately to `/login`.
- **Inactive Accounts:** Instantly blocked if `is_active = false`.
- **Missing Profiles:** Blocked if an Auth user lacks an active employee profile.
- **Admin-Only Routes:** Gated by `requiredRole="ADMIN"`.
- **Rate Management Routes:** Gated by `requiredPermission="CAN_MANAGE_RATES"` (or Admin role).
- **Session Restoration:** Renders a clean loading spinner during initial session recovery; zero protected content flashes to unauthenticated eyes.

