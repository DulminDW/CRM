# WINDOW COMPANIES CRM – COMPREHENSIVE TESTING CHECKLIST

## 1. Automated Test Suites (Regression & Core Invariants)

Run via `node scripts/run-tests.cjs` (All 14 suites must show `PASS` with 0 failures):

- [x] **Suite 1: Email Format Regex & Sanitation** (9/9 pass)
- [x] **Suite 2: Strict Season Dates Logic & Chronology** (4/4 pass)
- [x] **Suite 3: Season Date Overlap Detection** (3/3 pass)
- [x] **Suite 4: Composite Agency-Market Hierarchy Rule** (3/3 pass)
- [x] **Suite 5: Recipient Scopes Deduplication & Hierarchy Consistency** (3/3 pass)
- [x] **Suite 6: Flexible Rate Calculation Engine (Phase L 13 Scenarios)** (13/13 pass)
- [x] **Suite 7: Audit Actor & Setup Creator Identity Hardening (Phase 6C)** (9/9 pass)
- [x] **Suite 8: Hotel Contract Management & Document Vault (Phase 8C)** (16/16 pass)
- [x] **Suite 9: Hotel Rate Engine, Tier Conflicts & Custom Rates (Phase 9)** (22/22 pass)
- [x] **Suite 10: Email Preview, Dispatch Lifecycle & Retry Engine (Phase 9)** (7/7 pass)
- [x] **Suite 11: Device Email App Handoff, URL Encoding & Confirmation** (12/12 pass)
- [x] **Suite 12: Recipient Targeting Hierarchy & Contract Rate Sharing** (8/8 pass)
- [x] **Suite 13: Excel Bulk Import Engine & Hierarchy Validation** (18/18 pass)
- [x] **Suite 14: Employee Provisioning & Daily Task Assignment Engine** (10/10 pass)

---

## 2. End-to-End Workflow & UI Verification

### Workflow A: Authentication & Onboarding
- [ ] Attempt login with non-existent credentials -> Verify proper error message displayed.
- [ ] Attempt login with unprovisioned profile -> Verify "Profile Pending Provisioning" banner.
- [ ] Authenticate as active ADMIN -> Verify sidebar includes "Staff Directory", "Daily Tasks", and full rate features.
- [ ] Authenticate as regular STAFF (without `can_manage_rates`) -> Verify Rates and Employees links are hidden/blocked.

### Workflow B: Internal Employee Provisioning (`/employees`)
- [ ] Open Staff Directory as ADMIN.
- [ ] Click "Add New Employee" -> Enter full name, email, department, and role.
- [ ] Toggle `Can View & Manage Rates` on an employee -> Verify immediate state change.
- [ ] Toggle `Active / Inactive` status -> Confirm user deactivated.

### Workflow C: Employee Daily Task Assignment (`/tasks`)
- [ ] As ADMIN, click "New Task" -> Assign task to a staff member with high priority and due date.
- [ ] Log in / switch to assigned staff member -> Confirm task appears in their "Assigned to Me" queue.
- [ ] Move task status from `TODO` to `IN_PROGRESS` -> Verify activity log timestamp.
- [ ] Flag task as `BLOCKED` with reason -> Verify warning badge appears on task card.
- [ ] Complete task -> Confirm task moves to `DONE` and `completed_at` is stamped.

### Workflow D: Hotel Contract Management & Document Upload
- [ ] Open Hotels -> Select a hotel -> Navigate to "Contracts" tab.
- [ ] Create contract with start date, expiry date, commission rate, and terms.
- [ ] Attach contract PDF (<25MB) -> Verify file uploaded to `contract-documents` bucket.
- [ ] Attempt upload of non-PDF/unsupported file -> Verify validation error.

### Workflow E: Hotel Seasons & Rate Matrix
- [ ] Define seasons: Low, Peak, Shoulder.
- [ ] Attempt to define overlapping season date ranges -> Verify overlap validation blocks submission.
- [ ] Configure Rate Tiers (RED = Budget, GREEN = Preferred, YELLOW = Premium, CUSTOM = Ad-hoc).
- [ ] Run Rate Calculator -> Verify calculation matches formula: `(Base + Supplements) * Multipliers + Tax + Markup`.

### Workflow F: Recipient Targeting & Rate Sharing Flow (`/rates/share`)
- [ ] Select Hotel, Contract, and Season.
- [ ] Select Recipient Mode:
  - *Option 1:* Entire Agency Company -> Resolves all active agency members.
  - *Option 2:* Market within Company -> Filters members by targeted market.
  - *Option 3:* Specific Individual Member -> Targets single primary contact.
  - *Option 4:* Manual Multi-Selection -> Checkboxes allow bespoke grouping.
- [ ] Choose Rate Tier: GREEN / RED / YELLOW or CUSTOM Ad-Hoc rate with justification.
- [ ] Review Real-Time Email Preview -> Verify salutation, hotel name, rates table, terms, and signature.
- [ ] Click "Share via Device Email App" -> Verify `mailto:` link triggered and "Email Handoff Confirmation" dialog appears.
- [ ] Confirm handoff -> Verify record stored in `quotes` with status `DISPATCHED_CLIENT`.

### Workflow G: Excel Bulk Import Wizard (`/bulk-import`)
- [ ] Select category: "Hotels", "Seasons", "Agencies", "Markets", or "Members".
- [ ] Download Excel template -> Verify sample structure and headers.
- [ ] Upload populated spreadsheet -> Verify file parsed and displayed in Preview Table.
- [ ] Upload spreadsheet with intentional schema errors (e.g., missing required fields, invalid emails) -> Verify error report download.
- [ ] Commit valid import -> Verify records written to Supabase and summary logged.

---

## 3. Security, RLS & Edge Case Invariants

- [ ] Unauthenticated API query directly to PostgREST -> Verify `401 Unauthorized`.
- [ ] Non-admin user querying `/employees` or modifying `user_profiles` -> Verify `403 Forbidden` / RLS denial.
- [ ] Regular staff without `can_manage_rates` fetching `rates` -> Returns 0 rows.
- [ ] Special character injection in email body preview -> Verify proper URI escaping (`encodeURIComponent`).
- [ ] SQL Injection / Malicious inputs in search bars -> Handled safely via parameterized Supabase PostgREST queries.

