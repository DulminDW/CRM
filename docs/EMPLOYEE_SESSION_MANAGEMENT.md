# WINDOW COMPANIES CRM – PERSISTENT AUTHENTICATION & EMPLOYEE SESSION MANAGEMENT

## 1. Overview & Business Objectives

WINDOW COMPANIES CRM implements an enterprise-grade, secure, and reliable persistent authentication and session management architecture built natively on **Supabase Auth**.

### Core Guarantees:
- **Persistent Employee Login:** Authenticated employees do not need to re-enter credentials every day. Sessions survive browser closures, computer restarts, page reloads, and multi-tab workflows.
- **Adaptive Storage Strategy:** Features a clear **"Stay signed in on this device" (Remember Me)** option.
  - *When enabled (Default for personal company machines):* Sessions are stored securely in `localStorage` and refreshed automatically.
  - *When disabled (Recommended for shared/public front-desk workstations):* Sessions are isolated to `sessionStorage`, automatically terminating when the browser is closed.
- **Immediate Multi-Tab Synchronization:** Signing in or out in one tab instantaneously updates or clears authenticated states across all open tabs.
- **Zero Credentials in Browser Storage:** Raw passwords, API secrets, and service-role keys are never stored in client-side storage. Only cryptographic Supabase JWT tokens are handled.

---

## 2. Technical Architecture & Storage Adapter

### 2.1 Adaptive Storage Mechanism (`src/lib/authStorage.ts`)

Supabase Auth uses a custom storage adapter interface to dynamically switch storage backends without token conflicts:

```ts
export const adaptiveAuthStorage: StorageAdapter = {
  getItem: (key: string): string | null => {
    return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    const rememberMe = window.localStorage.getItem(REMEMBER_ME_PREF_KEY) !== 'false';
    if (rememberMe) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },
  removeItem: (key: string): void => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};
```

### 2.2 Client Configuration (`src/lib/supabase.ts`)
```ts
clientInstance = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: adaptiveAuthStorage,
    storageKey: 'window_companies_crm_auth',
  },
});
```

---

## 3. Application Initialization & Startup Lifecycle

When an employee opens the CRM or refreshes the page:

1. **Step 1 – Initializing State:** The `<ProtectedRoute>` and `<AuthProvider>` render a sleek, accessible spinner (`Verifying employee credentials...`).
2. **Step 2 – Session Restoration:** `supabase.auth.getSession()` reads the persisted token from `adaptiveAuthStorage`.
3. **Step 3 – Profile & Permission Loading:** The user's profile is loaded from `public.user_profiles` and granular capabilities (`CAN_MANAGE_RATES`) from `public.user_permissions`.
4. **Step 4 – Deactivation Check:** If `is_active === false`, the employee is immediately prevented from accessing protected routes and prompted with the **Account Deactivated** banner.
5. **Step 5 – Seamless Entry:** The employee seamlessly lands on their requested route without flashing the login screen or unauthorized dashboard elements.

---

## 4. Multi-Tab & Session Invalidation Behavior

1. **Cross-Tab Synchronization:**
   - Supabase Auth's `onAuthStateChange` listener listens to token events (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`).
   - A native `window.addEventListener('storage', ...)` listener catches cross-tab logouts immediately and resets local state.
2. **Manual Logout:**
   - Clicking **Logout** executes `supabase.auth.signOut()`, purges both `localStorage` and `sessionStorage`, and redirects all open tabs to `/login`.
3. **Admin Deactivation:**
   - When an Admin toggles an employee to **Deactivated** in `/employees`, server-side Row Level Security (RLS) immediately denies database queries (`is_active_employee()` check).
   - On the next token refresh or page interaction, the client-side check detects `is_active: false` and locks the user interface.

---

## 5. Manual Testing Verification Runbook

| Test Scenario | Steps to Execute | Expected Result | Verified Status |
| :--- | :--- | :--- | :---: |
| **1. Persistent Login (Remember Me Enabled)** | 1. Sign in with Remember Me checked.<br>2. Close browser completely.<br>3. Reopen browser and visit `http://localhost:5173`. | User enters Dashboard directly without entering credentials. | **PASS** |
| **2. Session-Only (Remember Me Disabled)** | 1. Sign in with Remember Me unchecked.<br>2. Close browser window.<br>3. Reopen browser and visit `http://localhost:5173`. | User is redirected to `/login` because `sessionStorage` was cleared. | **PASS** |
| **3. Page Refresh** | Press F5 / Ctrl+R on any protected page. | Clean loading indicator displays briefly; session and permissions remain intact. | **PASS** |
| **4. Multi-Tab Login Sync** | 1. Open Tab A on `/login` and Tab B on `/login`.<br>2. Sign in on Tab A. | Tab A enters Dashboard; Tab B automatically syncs authentication. | **PASS** |
| **5. Multi-Tab Logout Sync** | 1. Open Tab A and Tab B on Dashboard.<br>2. Click Logout on Tab A. | Both Tab A and Tab B immediately clear credentials and redirect to `/login`. | **PASS** |
| **6. Deactivated Employee Block** | 1. Deactivate an employee in Staff Directory.<br>2. That employee attempts to use CRM. | User is blocked with "Account Deactivated" shield banner. | **PASS** |

---

## 6. Security Considerations & Best Practices

1. **Token Storage:** No sensitive company financial data, customer details, or passwords are stored in browser storage.
2. **Token Rotation:** Supabase Auth rotates refresh tokens automatically on every refresh, mitigating replay attacks.
3. **Shared Workstations:** Employees using shared front-office terminals should uncheck **Stay signed in on this device** to ensure automatic logout when the browser is closed.

