# WINDOW COMPANIES CRM — PHASE 5 CRUD TEST REPORT

**Audit Date:** November 05, 2026 (Phase 5 Stabilization)  
**Classification:** Quality Assurance & Functional Verification  
**Target Environment:** Remote Supabase Production Instance (`fvxtnitlsbzmcuphefmv`)  
**Prefix Rule for Isolated Records:** `QA_TEST_2026_`  

---

## 1. Authentication & Session Resilience Testing

| Test ID | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|
| **AUTH-01** | Admin login with valid credentials (`techwindow@gmail.com`) | Session established; redirect to `/` | Redirected to `/`, user profile and role loaded | **PASS** |
| **AUTH-02** | Invalid email format | Form validation blocks request | Error: "Please enter your company email address." | **PASS** |
| **AUTH-03** | Invalid password handling | Auth error returned without leaking schema | Supabase Auth returns standard invalid login credentials | **PASS** |
| **AUTH-04** | Session restoration upon page reload (`F5`) | Local storage token restores user profile | `supabase.auth.getSession()` validates and restores profile | **PASS** |
| **AUTH-05** | Logout execution | Purges local storage; redirects to `/login` | Token cleared, immediate redirect to `/login` | **PASS** |
| **AUTH-06** | Direct URL access when unauthenticated (e.g. `/agencies`) | Redirects to `/login` with return intent | `ProtectedRoute` redirects to `/login` | **PASS** |

---

## 2. Agency Hierarchy (Levels 1, 2, 3) CRUD Testing

| Test ID | Module | Action / Test Case | Validation Rule Checked | Status |
|---|---|---|---|---|
| **AGN-01** | Travel Agencies | Create new agency | Name length $\ge 2$, trim spaces | **PASS** |
| **AGN-02** | Travel Agencies | Duplicate agency name | Unique constraint `uq_agency_name` rejects duplicate | **PASS** |
| **AGN-03** | Travel Agencies | Edit agency details | Name, Code, City, Country, Phone, Email updated | **PASS** |
| **AGN-04** | Travel Agencies | Search & Filter | Filters table by Name, Code, Location, Status | **PASS** |
| **AGN-05** | Travel Agencies | Delete with dependent markets | PostgreSQL foreign-key rejects deletion; advises deactivation | **PASS** |
| **MKT-01** | Agency Markets | Create market with parent agency | Required `agency_id`, name $\ge 2$ chars | **PASS** |
| **MKT-02** | Agency Markets | Duplicate market in same agency | `uq_agency_market` composite constraint rejects duplicate | **PASS** |
| **MKT-03** | Agency Markets | Same market name across different agencies | Permitted (e.g. "India Desk" under Agency A and B) | **PASS** |
| **MKT-04** | Agency Markets | Delete with active members | Foreign-key `fk_agency_members_composite_market` rejects delete | **PASS** |
| **MEM-01** | Agency Members | Cascading dropdowns | Selecting Agency dynamically loads only its markets | **PASS** |
| **MEM-02** | Agency Members | Invalid market-agency combination | Composite FK strictly rejects saving mismatch | **PASS** |
| **MEM-03** | Agency Members | Email format validation | `chk_member_email_format` enforced in frontend & DB | **PASS** |
| **MEM-04** | Agency Members | Same-desk duplicate email | Pre-flight check detects duplicate and blocks creation | **PASS** |
| **MEM-05** | Agency Members | Cross-desk duplicate email | Pre-flight warning informs operator with location context | **PASS** |

---

## 3. Hotel & Season Management CRUD Testing

| Test ID | Module | Action / Test Case | Validation Rule Checked | Status |
|---|---|---|---|---|
| **HTL-01** | Hotels | List & Search | Searches by Name, Code, Area; filters by Channel & Status | **PASS** |
| **HTL-02** | Hotels | Create Hotel | Name $\ge 2$ chars, Service channel (`BOTH/ONLINE/OFFLINE`) | **PASS** |
| **HTL-03** | Hotels | Duplicate Hotel Name | `uq_hotel_name` unique constraint blocks duplicate | **PASS** |
| **HTL-04** | Hotels | View Hotel Details Modal | Displays complete card metadata with seasons link | **PASS** |
| **HTL-05** | Hotels | Edit Hotel | Updates metadata and persists to Supabase | **PASS** |
| **HTL-06** | Hotels | Status Toggle | Permitted only for Admins & `CAN_MANAGE_RATES` holders | **PASS** |
| **SSN-01** | Seasons | List & Filter by Hotel | Dynamic URL synchronization (`?hotelId=...`) | **PASS** |
| **SSN-02** | Seasons | Strict Date Invariant (`date_to > date_from`) | Enforced by DB constraint `chk_season_dates` & UI | **PASS** |
| **SSN-03** | Seasons | Same-day dates (`date_to = date_from`) | Rejected with clear readable error | **PASS** |
| **SSN-04** | Seasons | Inverted dates (`date_to < date_from`) | Rejected with clear readable error | **PASS** |
| **SSN-05** | Seasons | Non-blocking Date Overlap Advisory | Detects overlapping date ranges; warns without blocking | **PASS** |
| **SSN-06** | Seasons | Duplicate Season Label per Hotel | `uq_hotel_season` composite unique constraint blocks duplicate | **PASS** |

