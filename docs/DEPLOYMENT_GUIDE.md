# WINDOW COMPANIES CRM – DEPLOYMENT & DATABASE MIGRATION GUIDE

## 1. Overview & Architecture

WINDOW COMPANIES CRM is built with:
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS.
- **Backend-as-a-Service:** Supabase (Managed PostgreSQL, PostgREST API, Supabase Auth, Supabase Storage, Realtime).
- **Target Hosting:** Vercel (or Netlify / Cloudflare Pages) for the frontend static build, Supabase Cloud for backend.

---

## 2. Supabase Database Deployment

### Migration Inventory
The database schema consists of migrations located in `supabase/migrations/`:

| Migration File | Description | Status |
| :--- | :--- | :--- |
| `000001_initial_schema.sql` | Core CRM base tables (agencies, members, hotels, contracts) | Deployed |
| `000002_rls_policies.sql` | Base row level security policies | Deployed |
| `000003_storage_buckets.sql` | Storage definitions | Deployed |
| `000004_fix_rls_recursion.sql` | RLS infinite recursion patch | Deployed |
| `000005_fix_user_profiles_rls.sql` | User profiles security patch | Deployed |
| `000006_fix_markets_rls.sql` | Markets table security patch | Deployed |
| `000007_fix_agency_markets_rls.sql` | Agency market junction security patch | Deployed |
| `000008_fix_agency_members_rls.sql` | Agency members security patch | Deployed |
| `000009_fix_quotes_rls.sql` | Quotations and rate share RLS | Pending Execution |
| `000010_hotel_seasons.sql` | Hotel seasons table & season date validation triggers | Pending Execution |
| `000011_contract_rates.sql` | Contract rate tiers (GREEN/RED/YELLOW) & custom rates | Pending Execution |
| `000012_rate_shares_and_history.sql` | Rate dispatch logging & recipient junction | Pending Execution |
| `000013_audit_trail_system.sql` | Detailed system-wide audit trail & triggers | Pending Execution |
| `000014_system_settings.sql` | System configuration & company parameter store | Pending Execution |
| `20261111000015_excel_bulk_import_history.sql` | Excel bulk import logs & batch run metadata | Pending Execution |
| `20261111000016_employee_daily_tasks.sql` | Internal staff tasks, comments & activity timeline | Pending Execution |

### Applying Pending Migrations (Safe Sequence)
To apply migrations `000009` through `20261111000016` to your live Supabase project:

1. **Option A: Using Supabase CLI (Recommended)**
   ```bash
   # Login to your Supabase CLI account
   npx supabase login

   # Link to the remote project
   npx supabase link --project-ref fvxtnitlsbzmcuphefmv

   # Push pending migrations safely
   npx supabase db push
   ```

2. **Option B: Using Supabase SQL Editor**
   - Open your project dashboard at `https://supabase.com/dashboard/project/fvxtnitlsbzmcuphefmv`.
   - Navigate to the **SQL Editor**.
   - Sequentially paste and execute the contents of files `000009` through `20261111000016`.

### Storage Bucket Provisioning
In the Supabase Dashboard under **Storage**:
1. Click **New Bucket**.
2. Name: `contract-documents`.
3. Set **Public Bucket** to `OFF` (Private).
4. Set **File size limit** to `25MB`.
5. Allowed MIME types: `application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, image/jpeg, image/png`.

### Initial Admin Provisioning
To enable initial login, insert an initial admin record into `public.user_profiles` matching an authenticated Supabase Auth UID:
```sql
INSERT INTO public.user_profiles (id, email, full_name, role, can_manage_rates, is_active)
VALUES (
  'YOUR_SUPABASE_AUTH_USER_UUID',
  'admin@windowcompanies.com',
  'Principal Administrator',
  'ADMIN',
  true,
  true
);
```

---

## 3. Frontend Deployment (Vercel)

### Deploying via Vercel CLI
```bash
# Install Vercel CLI globally if needed
npm i -g vercel

# Deploy preview
vercel

# Deploy production
vercel --prod
```

### Environment Variables on Vercel
In your Vercel Project Settings -> **Environment Variables**, configure:
- `VITE_SUPABASE_URL`: Your Supabase project URL (e.g., `https://fvxtnitlsbzmcuphefmv.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Your Supabase project Public Anon Key
- `VITE_APP_ENV`: `production`

---

## 4. Verification Post-Deployment

1. Open the production URL (e.g., `https://crm.windowcompanies.com`).
2. Verify SSL certificate is valid.
3. Perform test login using provisioned Admin credentials.
4. Verify navigation to `/employees`, `/tasks`, `/hotels`, and `/rates/share`.
5. Test a sample PDF upload in the contract document vault.
6. Verify console has no unhandled errors or CORS rejections.

