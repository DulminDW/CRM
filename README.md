# WINDOW COMPANIES CRM

Internal CRM for managing confidential partner hotel rates, travel agency contacts, negotiated pricing tiers, sales activities, internal team communications, and rate quote distribution.

---

## 1. Project Technology Stack

- **Framework:** React 19 + TypeScript (Strict Mode) + Vite 6
- **Routing:** React Router v7
- **Styling:** Tailwind CSS (Navy `#102344`, Blue `#1765CE`, Light `#F4F7FC`)
- **Icons:** Lucide React
- **Backend & Database (Planned):** Supabase (PostgreSQL with Row Level Security)
- **Deployment Target (Planned):** Vercel

---

## 2. Security First Architecture

This CRM contains confidential pricing agreements and partner hotel relationships. Security is designed in depth:

1. **Zero Client Trust:** Pricing calculations and email distributions execute server-side.
2. **Default-Deny Access:** Supabase RLS policies will gate every PostgreSQL table.
3. **Secret Isolation:** Supabase service-role keys and email API keys are strictly excluded from client code.
4. **No Fake Authentication:** Insecure localStorage tokens and simulated login pages are forbidden.
5. **Quote Immutability:** Historical quotes are saved as exact snapshots that never change when future hotel rates are updated.

See [`SECURITY_ARCHITECTURE.md`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/SECURITY_ARCHITECTURE.md) and [`SECURITY_CHECKLIST.md`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/SECURITY_CHECKLIST.md) for full specifications.

---

## 3. How to Run Locally

### Prerequisites
- Node.js (v20+ recommended, v22 installed)
- npm (v10+)

### Start Development Server
```bash
# 1. Install dependencies (already installed)
npm install

# 2. Start the local Vite development server
npm run dev
```

Open your browser at `http://localhost:5173/`.

### Run Code Quality Checks
```bash
# Validate TypeScript strict types
npx tsc -b

# Run ESLint static analysis
npm run lint

# Test production build
npm run build
```

---

## 4. Current Phase Status

- **Phase 1 (Current):** Application Scaffolding, Security Architecture, Design System & 15 Route Shells.
- **Phase 2 (Pending Approval):** Supabase Database Schema, Row Level Security Policies & Supabase Auth.
