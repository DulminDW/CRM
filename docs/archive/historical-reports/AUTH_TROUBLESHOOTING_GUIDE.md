# WINDOW COMPANIES CRM — AUTHENTICATION TROUBLESHOOTING GUIDE

**Document Version:** 1.0.0  
**Date:** November 04, 2026  
**Audience:** CRM Engineering & Systems Support  

---

## Common Issues & Resolutions

### 1. "Profile Pending Provisioning" Screen Appears After Login
- **Cause:** The user successfully logged in through Supabase Auth (`auth.users`), but has not been assigned an employee record in `public.user_profiles`.
- **Resolution:** As a CRM Administrator, insert an active employee record in `public.user_profiles` matching the user's UUID:
  ```sql
  INSERT INTO public.user_profiles (id, full_name, role, is_active)
  VALUES ('<USER_UUID>', 'Employee Full Name', 'STAFF', TRUE);
  ```

### 2. "Account Deactivated" Screen Appears
- **Cause:** The user's record in `public.user_profiles` has `is_active = FALSE`.
- **Resolution:** An Administrator must verify the employee's authorization and reactivate them in `public.user_profiles`:
  ```sql
  UPDATE public.user_profiles SET is_active = TRUE WHERE id = '<USER_UUID>';
  ```

### 3. "Access Restricted: Admin Only" on Settings Route
- **Cause:** Staff users without `role = 'ADMIN'` cannot access administrative pages such as `/settings`.
- **Resolution:** Expected security behavior. Only promote a user to `ADMIN` if officially approved by Window Companies management.

### 4. "Permission Required: CAN_MANAGE_RATES" on Rates Page
- **Cause:** Staff members require the explicit capability `CAN_MANAGE_RATES` to access `/rates` or `/special-rates`.
- **Resolution:** An Administrator must grant this capability in `public.user_permissions`:
  ```sql
  INSERT INTO public.user_permissions (user_id, permission_key, granted_by)
  VALUES ('<USER_UUID>', 'CAN_MANAGE_RATES', '<ADMIN_UUID>');
  ```

### 5. Invalid Login Credentials Error
- **Cause:** Incorrect email or password entered.
- **Resolution:** Re-enter credentials. For security, the login error message is intentionally generic to prevent user enumeration attacks.

