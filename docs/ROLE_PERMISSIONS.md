# WINDOW COMPANIES CRM – ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS

## 1. System Roles Overview

WINDOW COMPANIES CRM defines three primary application roles managed in the `public.user_profiles` table:

1. **`ADMIN`**
   - Company directors, executives, and senior system administrators.
   - Unrestricted access across all operational, financial, employee, and audit data.
2. **`STAFF`**
   - Regular CRM staff, reservation officers, and operations executives.
   - Manages day-to-day agencies, members, tasks, and sales activities.
   - Rate viewing and sharing is conditioned by the `can_manage_rates` feature flag.
3. **`RATE_MANAGER` (Staff with `can_manage_rates = true`)**
   - Commercial rate specialists, contracting managers, and yield officers.
   - Permitted to view, calculate, negotiate, and share sensitive contracted hotel rates.

---

## 2. Permission Matrix by Module

| Module / Resource | ADMIN | STAFF (Standard) | RATE_MANAGER (`can_manage_rates`) | Enforcement Level |
| :--- | :---: | :---: | :---: | :--- |
| **Authentication & Profile** | Full | Self Read/Update | Self Read/Update | Supabase Auth + RLS |
| **User & Employee Management** | **Full (Invite/Edit/Role)** | None | None | Route Guard (`/employees`) + Service Check |
| **Daily Tasks Assignment** | **Create/Assign to Any** | Update Assigned Only | Update Assigned Only | RLS (`tasks` policy) + UI Logic |
| **Hotels & Properties** | Full CRUD | Read / Add New | Read / Add New | RLS + Service Layer |
| **Hotel Seasons** | Full CRUD | Read / Add New | Read / Add New | RLS + Service Layer |
| **Hotel Contracts & Documents** | Full CRUD + Storage | View Metadata Only | View Metadata Only | RLS + Private Storage Bucket |
| **Rate Management (Tiers/Prices)** | Full CRUD | **Blocked** | Full CRUD | Route Guard + Rate Filter |
| **Rate Calculator & Quoting** | Full Access | **Blocked** | Full Access | Route Guard (`/rates/calculator`) |
| **Rate Sharing & Dispatch** | Full Access | **Blocked** | Full Access | Route Guard (`/rates/share`) |
| **Rate History & Audit** | Full History | **Blocked** | Full History | Route Guard (`/rates/history`) |
| **Agencies & Contact Members** | Full CRUD | Full CRUD | Full CRUD | RLS + Service Layer |
| **Bulk Excel Import** | Full Import | Full Import | Full Import | Route Guard (`/bulk-import`) |
| **Sales Activities & Leads** | Full Access | Creator / Participant | Creator / Participant | RLS (`sales_activities`) |
| **Internal Team Chat** | Full Access | Department / Channels | Department / Channels | Realtime Broadcast + RLS |
| **Reports & Commercial Analytics** | Full Access | Standard Operational | Standard Operational | UI Dashboard Logic |
| **Audit Logs & Security Trail** | **Full Audit Trail** | None | None | RLS + Dedicated Admin View |

---

## 3. Row Level Security (RLS) Rules

### 3.1 `user_profiles`
- **SELECT**: All authenticated users can read basic coworker profiles (id, full_name, email, role, avatar_url).
- **INSERT / UPDATE**: Restricted to users where `auth.uid()` has `role = 'ADMIN'`.

### 3.2 `tasks`
- **SELECT**: Authenticated users can view tasks assigned to them, created by them, or all tasks if `role = 'ADMIN'`.
- **INSERT**: Authenticated users can create tasks; assigning to other users requires `role = 'ADMIN'`.
- **UPDATE**: Assigned users can update `status`, `completed_at`, and `blocker_reason`. Reassigning or editing core description requires `role = 'ADMIN'`.

### 3.3 `rates` & `contract_rates`
- **SELECT / INSERT / UPDATE**: Conditioned on `(auth.jwt() ->> 'role' = 'ADMIN') OR (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND can_manage_rates = true))`.

### 3.4 `audit_logs`
- **INSERT**: Handled automatically via database triggers on mutations or backend audit logger.
- **SELECT**: Strictly restricted to `role = 'ADMIN'`.

---

## 4. Frontend Route Guards

Frontend routing in [AppRoutes.tsx](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/src/routes/AppRoutes.tsx) enforces protection using `<ProtectedRoute requiredRole="..." requireRatePermission={...}>`:

```tsx
// Example: Employee Management Guard
<Route
  path="/employees"
  element={
    <ProtectedRoute requiredRole="ADMIN">
      <EmployeesPage />
    </ProtectedRoute>
  }
/>

// Example: Rate Sharing Guard
<Route
  path="/rates/share"
  element={
    <ProtectedRoute requireRatePermission>
      <ShareRatesPage />
    </ProtectedRoute>
  }
/>
```

