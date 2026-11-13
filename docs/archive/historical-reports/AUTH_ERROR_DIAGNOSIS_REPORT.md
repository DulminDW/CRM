# WINDOW COMPANIES CRM — AUTH ERROR DIAGNOSIS & RECOVERY REPORT

**Document Version:** 1.0.0  
**Date:** November 04, 2026  
**Status:** Complete & Validated  
**Author:** Senior React, TypeScript, Node.js & Supabase Engineer  
**Classification:** Internal Technical Architecture & Recovery Audit  

---

## 1. Executive Summary

During initial preparation for Phase 2B (Authentication & Authorization), an execution error was encountered:
- `npm install @supabase/supabase-js` appeared to exit with code 1.
- Initial subshell PATH checks reported `'node'` and `'npm'` not recognized as operable programs.
- TypeScript, ESLint, and production build checks were interrupted.

An investigation into the host execution environment, Node/npm paths, package installations, and frontend authentication files was performed in accordance with strict recovery rules.

---

## 2. Task 1: Diagnose Node and npm

### 2.1 Environmental Path & Binary Discovery
Executing `where.exe node` and `where.exe npm` in standard subshells initially failed because standard Windows process sandboxing / default subshells did not inherit the NVM (Node Version Manager) runtime paths configured on the machine.

Inspection of the System and User PATH environment variables revealed:
- `C:\nvm4w\nodejs` (NVM Windows active symlink target)
- `C:\Users\Nethshan Dulmin\AppData\Roaming\npm`

Explicit verification against the discovered binary locations confirmed:
- **Node.js version:** `v22.22.0` (`C:\nvm4w\nodejs\node.exe`)
- **npm version:** `10.9.4` (`C:\nvm4w\nodejs\npm.cmd`)
- **Current Working Directory:** `C:\Users\Nethshan Dulmin\Desktop\CRM`

### 2.2 Root Cause of Earlier Installation Failure
The prior failure was **not** due to missing Node.js or corrupt packages. Rather:
1. In the terminal session executing the initial commands, PATH environment resolution did not load `C:\nvm4w\nodejs`, causing command invocations to fail before reaching `npm`.
2. Once the execution PATH was properly wired to `C:\nvm4w\nodejs`, Node.js v22.22.0 and npm 10.9.4 executed reliably without errors.

---

## 3. Task 2: Supabase Client Installation Verification

### 3.1 Package Verification
- Dependency: `@supabase/supabase-js`
- Version locked: `^2.118.0` (Resolved: `2.118.0`)
- Verification:
  - `package.json`: Present under `dependencies` (`"@supabase/supabase-js": "^2.118.0"`).
  - `package-lock.json`: Present with integrity hash and MIT license definition.
  - `node_modules/@supabase/supabase-js`: Verified existing on disk.

No lockfile churn or additional package modifications were needed.

---

## 4. Task 3: Authentication Files Inspection

A line-by-line inspection was conducted across all authentication-related files:

| File Path | Role / Purpose | Inspection Findings |
|---|---|---|
| `src/lib/supabase.ts` | Supabase client initialization | Safely reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (with fallback to `VITE_SUPABASE_ANON_KEY`). Sets `isSupabaseConfigured` flag. Uses a fallback dummy client to prevent runtime crash in unconfigured local environments. |
| `src/types/auth.ts` | Auth data types & interfaces | Defines `UserRole` (`'ADMIN' \| 'STAFF'`), `PermissionKey`, `UserProfile`, `UserPermission`, `AuthState`, `AuthContextType`. |
| `src/contexts/authContextDef.ts` | React context definition | Separated to prevent Fast Refresh circular dependencies. |
| `src/contexts/AuthContext.tsx` | Supabase session & employee profile provider | Subscribes to `onAuthStateChange`, fetches `user_profiles` and `user_permissions` from PostgreSQL, handles `signInWithEmail` and `signOut`. Role checks require `profile.is_active === true`. |
| `src/hooks/useAuth.ts` | Custom hook | Exposes auth context cleanly with hook safety guard. |
| `src/pages/LoginPage.tsx` | Public login interface | Registered at `/login`. Handles input validation, safe error presentation, and redirects to target location after authentication. Warns if Supabase environment variables are missing. |
| `src/components/common/ProtectedRoute.tsx` | Route authorization guard | Prevents unauthenticated access (`redirect -> /login`). Validates that authenticated users possess an active internal profile in `user_profiles`. Enforces `requiredRole` and `requiredPermission`. |
| `src/pages/NotFoundPage.tsx` | 404 handler | Registered at `/404` and catch-all `*`. |
| `src/routes/AppRoutes.tsx` | Application routing | Correctly registers `/login` and `/404` as public routes. Enforces `ProtectedRoute` on all CRM console pages. Restricts `/rates` and `/special-rates` to `CAN_MANAGE_RATES`, and `/settings` to `ADMIN`. |
| `src/App.tsx` | Application root | Proper nesting hierarchy: `ErrorBoundary` -> `AuthProvider` -> `BrowserRouter` -> `AppRoutes`. |
| `src/components/layout/Navbar.tsx` | Navigation bar | Displays active employee name and role from `profile`. Includes secure logout trigger and visual Supabase configuration indicator. |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar | Uses `hasRole` and `hasPermission` from `useAuth` to display accessible navigation targets. |

### Key Security & Architecture Findings:
- **Public Route Registration:** `/login` is registered outside the `ProtectedRoute` wrapper.
- **Unprovisioned Authenticated User Blocking:** Authenticated users who do not have a matching active profile record in `public.user_profiles` are blocked by `ProtectedRoute` with a provisioning notice, preventing access to CRM console pages.
- **Non-Trust of Frontend Roles:** All role verification (`hasRole`, `hasPermission`) relies strictly on the database-queried `profile.role` and `permissions` table, rather than easily tampered client-side localStorage values or client claims.
- **Graceful Unconfigured Fallback:** When credentials are absent, the UI shows a clear setup banner rather than crashing.

---

## 5. Task 4: Environment Configuration Audit

- `.env.example` was inspected and updated to document both `VITE_SUPABASE_PUBLISHABLE_KEY` and legacy alias `VITE_SUPABASE_ANON_KEY`.
- `.gitignore` rigorously protects `.env`, `.env.*`, and `.env.local` while excluding `.env.example`.
- No real secret keys, service role keys, or database credentials exist in repository files or version control.
- `isSupabaseConfigured` accurately evaluates whether environment keys are present or are placeholder values; no false live connections are claimed.

---

## 6. Task 5: Build and Lint Recovery Results

Each build and quality step was executed with captured outcomes:

1. **`npx tsc -b` (TypeScript Compilation):**  
   - Result: **Exit Code 0**  
   - Output: 0 errors.

2. **`npm run lint` (ESLint Static Code Analysis):**  
   - Result: **Exit Code 0**  
   - Output: 0 warnings, 0 errors across all files.

3. **`npm run build` (Vite Production Build):**  
   - Result: **Exit Code 0**  
   - Output:
     - `dist/index.html` (0.65 kB)
     - `dist/assets/index-B43xGb9C.css` (24.22 kB)
     - `dist/assets/index-CaqhqU0_.js` (555.00 kB)
     - Built cleanly in 9.88s.

---

## 7. Task 6: RLS Draft Review (`docs/database/002_auth_rls_DRAFT.sql`)

Inspection against the 26-table schema (`docs/database/001_initial_schema_DRAFT.sql`) and security requirements yielded the following review:

1. **Schema Match:**
   - Targets `user_profiles`, `user_permissions`, and domain tables (`travel_agencies`, `hotels`, `hotel_rate_sheets`, `agency_special_rates`, `audit_logs`, etc.).
   - Helper functions `is_active_employee()`, `is_admin()`, and `can_manage_rates()` correctly check `is_active = TRUE` and match the schema.
2. **Privilege Escalation Safeguards:**
   - Staff cannot self-promote to `ADMIN`: `user_profiles_update_policy` enforces that non-admins cannot change `role` or `is_active`.
   - `user_permissions` table is restricted to `ADMIN` only for INSERT, UPDATE, and DELETE.
   - Functions are defined with `SECURITY DEFINER` and explicitly reset `SET search_path = public, pg_temp`, preventing search_path hijacking attacks.
   - Public schema function execution is revoked from `PUBLIC` and granted only to `authenticated`.
3. **Execution Guard:**
   - The file contains strict top-level draft boundaries and remains unexecuted in accordance with the project rules.

---

## 8. Remaining Blockers & Next Steps

1. **Supabase Environment Variables:**
   - Active testing of real logins requires supplying valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
2. **Database Provisioning (Phase 2B):**
   - The initial database schema (`001_initial_schema_DRAFT.sql`) and RLS policies (`002_auth_rls_DRAFT.sql`) await explicit owner approval before deployment to PostgreSQL.
3. **Zero-Fake-Auth Compliance:**
   - Full live authentication will be validated once real Supabase project credentials and tables are provisioned.

