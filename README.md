# WINDOW COMPANIES MANAGEMENT SYSTEM (CRM)

A comprehensive, enterprise-grade Customer Relationship Management, Hotel Contract Management, and Rate Distribution platform built exclusively for **WINDOW COMPANIES (PVT) LTD.**

---

## 🌟 Key Features & Capabilities

1. **Hotel & Property Portfolio:**
   - Detailed property directories, room inventory, meal plans, and amenities.
   - Non-overlapping seasonal validity calendars (Peak, Low, Shoulder).
   - Executed contract vault with encrypted document storage (PDF/DOCX).

2. **Travel Agency & Market Hierarchy:**
   - Multi-tier company management: Agency -> Market -> Contact Person.
   - Flexible recipient targeting for commercial rate circulars.

3. **Dynamic Rate Engine & Instant Quotations:**
   - Tiered rate categories: **GREEN** (Standard), **RED** (Budget), **YELLOW** (Premium), and **CUSTOM** (Negotiated).
   - Real-time rate calculator accounting for base tariffs, room categories, season multipliers, meal supplements, tax, and company markups.

4. **Rate Sharing & Email Dispatch Life-Cycle:**
   - Dynamic recipient resolution: Entire Company, Market Segment, Individual Agent, or Bespoke Checkbox Grouping.
   - Live formatted email preview with booking terms and company signature.
   - Seamless handoff to local email clients (`mailto:`) or Gmail web client with post-dispatch confirmation tracking.

5. **Operational Administration & Team Productivity:**
   - **Internal Employee Directory:** Role-based access control (`ADMIN` vs. `STAFF`) with granular rate viewing permissions (`can_manage_rates`).
   - **Daily Task Assignment:** Assign tasks with priority, due date, blocker notifications, comments, and activity logs.
   - **Excel Bulk Import Wizard:** Download standardized templates, validate spreadsheets in-browser, and bulk import hotels, seasons, agencies, markets, or members.
   - **Audit Trail & System Settings:** Complete audit history tracking critical rate calculations, updates, and dispatches.

---

## 🏗️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, SheetJS (`xlsx`)
- **Backend / Database:** Supabase (PostgreSQL 15+, PostgREST, Row Level Security, Auth, Storage, Realtime)
- **Testing & Verification:** Custom automated test runner with 14 comprehensive test suites (137 verified assertions)
- **Build & Quality:** Strict TypeScript (`tsc -b`), ESLint, PostCSS

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd CRM
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the project root:
```env
VITE_SUPABASE_URL=https://fvxtnitlsbzmcuphefmv.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_APP_ENV=development
VITE_APP_TITLE="WINDOW COMPANIES CRM"
```

### 3. Run Automated Tests
```bash
node scripts/run-tests.cjs
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build
```bash
npm run build
```

---

## 📚 Complete Project Documentation

Extensive technical, operational, and architectural documentation is available in the `docs/` folder:

- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)**: Frontend components, Supabase PostgREST layer, and data flow.
- **[Database Design & ERD](docs/DATABASE_DESIGN.md)**: 22-table database schema with Mermaid entity-relationship diagram.
- **[Role-Based Access Control](docs/ROLE_PERMISSIONS.md)**: Role permissions matrix and Row Level Security rules.
- **[Service API Reference](docs/API_REFERENCE.md)**: Exhaustive TypeScript API reference for all backend services.
- **[Testing & QA Checklist](docs/TESTING_CHECKLIST.md)**: Automated and end-to-end verification checklist.
- **[User Operational Guide](docs/USER_GUIDE.md)**: Employee user manual for daily CRM tasks.
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: Instructions for Supabase migration push and Vercel hosting.
- **[Environment Variables](docs/ENVIRONMENT_VARIABLES.md)**: Complete variable definitions and templates.
- **[Backup & Recovery](docs/BACKUP_AND_RECOVERY.md)**: Disaster recovery runbooks and snapshot policies.
- **[Production Readiness Checklist](docs/PRODUCTION_CHECKLIST.md)**: Pre-flight launch verification list.
- **[Project Audit & Status](docs/PROJECT_AUDIT.md)**: Ground-truth audit of all 24 system modules.

---

## 🔒 Security & Compliance

- **Zero Secret Exposure:** Client builds only include public anonymous keys. Service-role secrets are never bundled or committed.
- **Row Level Security (RLS):** All 22 database tables are protected with strict RLS policies preventing unauthorized access to contracted rates and employee profiles.
- **Audit Logging:** Administrative actions, rate dispatches, and bulk imports are logged to immutable audit tables.
