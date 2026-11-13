# WINDOW COMPANIES CRM — ADMIN BOOTSTRAP GUIDE

**Document Version:** 2.0.0  
**Date:** November 04, 2026  
**Classification:** Internal Security Operations Manual  
**Target Database:** Supabase PostgreSQL (`fvxtnitlsbzmcuphefmv`)  
**Designated Initial Administrator:** `techwindow@gmail.com`  

---

## 1. Overview & Security Mandate

To maintain strict security standards:
- **No hardcoded credentials** exist in source code or repositories.
- **No public sign-up or admin registration** endpoint is permitted in the application.
- An automated PostgreSQL trigger (`on_auth_user_created_admin`) is actively deployed in migration `20261104000004_admin_provisioning_trigger.sql`.

---

## 2. Automated Admin Provisioning Mechanism

Because migration `20261104000004_admin_provisioning_trigger.sql` is live on the remote database:

As soon as `techwindow@gmail.com` is created or invited in Supabase Auth:
1. The `AFTER INSERT ON auth.users` trigger fires immediately.
2. It automatically creates the corresponding record in `public.user_profiles` with:
   - `role = 'ADMIN'`
   - `full_name = 'System Administrator'`
   - `is_active = TRUE`
3. It automatically provisions the full administrative capability set in `public.user_permissions`:
   - `CAN_MANAGE_RATES`
   - `CAN_MANAGE_USERS`
   - `CAN_CREATE_CHAT_GROUPS`
4. It logs the event to `public.audit_logs` (`action = 'ADMIN_AUTO_PROVISIONED'`).

---

## 3. How to Set Up the Initial Admin Password (Owner Step)

To finalize the initial account safely without passwords ever passing through Antigravity or chat:

### Option A: Create User in Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard: **Authentication -> Users**.
2. Click **Add User** -> **Create User**.
3. Email: `techwindow@gmail.com`.
4. Enter your chosen secure password and check **Auto Confirm User**.
5. Click **Create User**.
6. The database trigger will automatically grant your account full Admin privileges.

### Option B: Check Your Inbox
A password recovery / setup link has been dispatched to `techwindow@gmail.com`. You can click the link in your email to set your personal administrator password directly.

---

## 3. Verification

1. Start your local CRM development server: `npm run dev`
2. Open `http://localhost:5173/login` in your browser.
3. Sign in with the administrator email and password configured in Step 1.
4. Verify:
   - Successful redirection to `/` (Dashboard).
   - Navbar displays the user's name and **Administrator** badge.
   - Admin routes like `/settings` and rate management routes `/rates` are fully accessible without restriction.

