# WINDOW COMPANIES CRM – PRODUCTION READINESS PRE-FLIGHT CHECKLIST

Before promoting the WINDOW COMPANIES MANAGEMENT SYSTEM to production use, verify that every item below has been audited and approved.

---

## 1. Database & Security

- [ ] **Pending Migrations Applied:** Migrations `000009` through `20261111000016` deployed to Supabase.
- [ ] **Row Level Security (RLS) Active:** RLS confirmed `ENABLED` on all 22 tables.
- [ ] **No Infinite RLS Recursion:** All RLS policies verified to use non-recursive auth checking.
- [ ] **Rate Access Control Verified:** Confirmed that users without `can_manage_rates` cannot read records from `rates` or `contract_rates`.
- [ ] **Admin Profile Provisioned:** At least one active `ADMIN` user profile exists in `public.user_profiles` matching an authenticated Supabase user.
- [ ] **Storage Bucket Created:** Private bucket `contract-documents` exists with 25MB limit.
- [ ] **Service Role Key Protected:** Service role key is never bundled in frontend JavaScript or committed to git.

---

## 2. Application Build & Code Quality

- [ ] **TypeScript Build:** `npx tsc -b` passes with **0 errors**.
- [ ] **ESLint Quality Check:** `npm run lint` passes with **0 errors**.
- [ ] **Production Asset Emission:** `npm run build` completes successfully; minified assets emitted in `dist/`.
- [ ] **Automated Test Suites:** All 14 test suites in `scripts/run-tests.cjs` return `PASS` (137/137 assertions passing).
- [ ] **Console Cleanliness:** Browser developer tools show zero unhandled exceptions or broken image links on all major routes.

---

## 3. Business Workflows & Functional Auditing

- [ ] **Hotel & Season Hierarchy:** Hotels, Room Types, Meal Plans, and Non-overlapping Seasons can be created and queried.
- [ ] **Contract Vault:** Contracts can be authored and PDF copies uploaded/downloaded.
- [ ] **Agency & Contact Scoping:** Travel agencies, markets, and contact persons maintain correct relational hierarchy.
- [ ] **Rate Engine & Quotations:** Multi-tier rate calculation (GREEN, RED, YELLOW, CUSTOM) produces exact mathematically sound numbers.
- [ ] **Email Preview & Handoff:**
  - Salutation dynamically targets primary recipient.
  - Rate tables and valid booking conditions format cleanly.
  - `mailto:` encoding does not truncate long hotel and season descriptions.
  - Handoff confirmation dialog updates quote dispatch status in database.
- [ ] **Daily Tasks Workflow:** Admins can assign tasks to employees; employees can update progress and flag blockers.
- [ ] **Excel Bulk Import:** Valid spreadsheets import safely; invalid data generates descriptive error workbooks without committing partial corruption.

---

## 4. Infrastructure & Hosting

- [ ] **Vercel Project Setup:** Linked to `main` or `production` Git branch with automated deployment previews.
- [ ] **Production Domain & SSL:** Custom domain (e.g., `crm.windowcompanies.com`) mapped with valid SSL certificate.
- [ ] **Environment Variables:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured in Vercel settings.
- [ ] **Error Monitoring:** Sentry or console monitoring configured for uncaught frontend exceptions.
- [ ] **PostgreSQL Point-in-Time Recovery:** Enabled in Supabase project dashboard.

