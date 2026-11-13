# WINDOW COMPANIES CRM — PROJECT FOLDER STRUCTURE

**Status Date:** November 02, 2026  
**Auditor:** Senior Full-Stack Developer & Software Project Auditor  
**Project:** WINDOW COMPANIES CRM (Window Companies (Pvt) Ltd)  

---

## 1. Current Verified Workspace Structure

The project has been organized to reflect the recommended scalable architecture.

```text
crm/
├── .env.example                                      # Environment variable template with safe placeholders
├── .gitignore                                        # Comprehensive ignore rules (secrets, node_modules, dist)
├── DEVELOPMENT_PROGRESS.md                           # Master development progress and milestone tracker
├── README.md                                         # Project setup and overview documentation
├── SECURITY_ARCHITECTURE.md                          # Master security blueprint and attack surface analysis
├── SECURITY_CHECKLIST.md                             # Security controls verification checklist
├── SECURITY_PHASE1_AUDIT.md                          # Independent Phase 1 security audit report
├── WINDOW_COMPANIES_CRM_COMPLETE_PROJECT_HANDOVER.md # Master requirements specification & memory
├── eslint.config.js                                  # ESLint 9 flat configuration
├── index.html                                        # HTML entry point with metadata and branding
├── package-lock.json                                 # Exact package lockfile
├── package.json                                      # Dependency manifest and npm build scripts
├── postcss.config.js                                 # PostCSS configuration for Tailwind
├── tailwind.config.js                                # Tailwind CSS theme configuration (Navy, Blue, Tiers)
├── tsconfig.app.json                                 # TypeScript compiler options (Strict Mode)
├── tsconfig.json                                     # Root TypeScript project references
├── tsconfig.node.json                                # TypeScript config for Node/Vite tooling
├── vite.config.ts                                    # Vite 6 bundler config
│
├── public/                                           # Static assets served at root
│   ├── favicon.svg                                   # Application favicon
│   └── icons.svg                                     # Static icon sprite
│
├── src/                                              # React/TypeScript application source
│   ├── assets/                                       # Images, logos, and illustration assets
│   ├── components/                                   # Reusable UI components
│   │   ├── common/                                   # General shared components (Buttons, Modals, Badges)
│   │   ├── layout/                                   # Structural components (Sidebar, Navbar, MainLayout)
│   │   └── ui/                                       # Reusable presentation shells (PageShell, ErrorBoundary)
│   ├── pages/                                        # 15 Route page components (Dashboard, Rates, Agencies, etc.)
│   ├── routes/                                       # Application route definitions (AppRoutes.tsx)
│   ├── hooks/                                        # Custom React hooks (for future live data & audio recording)
│   ├── services/                                     # API service modules (for future Supabase & email dispatch)
│   ├── lib/                                          # Third-party library initializers (for future supabase.ts)
│   ├── types/                                        # TypeScript domain contracts (crm.ts)
│   ├── utils/                                        # Utility functions (formatting, date calculations, validation)
│   ├── constants/                                    # Application constants (rate colors, scope enums)
│   ├── contexts/                                     # React Context providers (AuthContext, NotificationContext)
│   ├── styles/                                       # Additional CSS modules or typography overrides
│   ├── App.tsx                                       # Root application component with ErrorBoundary & Router
│   ├── index.css                                     # Base Tailwind CSS directives and custom scrollbars
│   └── main.tsx                                      # React DOM rendering entry point
│
├── docs/                                             # Project documentation repository
│   ├── database/                                     # Complete Phase 2A database architectural specifications
│   │   ├── 001_initial_schema_DRAFT.sql              # Draft PostgreSQL DDL schema (26 tables)
│   │   ├── DATABASE_ARCHITECTURE.md                  # Master database architecture specification
│   │   ├── DATABASE_CONSTRAINTS_AND_INDEXES.md       # Foreign keys, check constraints, and performance indexes
│   │   ├── DATABASE_DATA_DICTIONARY.md               # Column-by-column data dictionary for all 26 tables
│   │   ├── DATABASE_ERD.md                           # 4 Mermaid entity relationship diagrams
│   │   ├── DATABASE_OPEN_QUESTIONS.md                # 24 unresolved business and financial questions
│   │   ├── DATABASE_SECURITY_RLS_DESIGN.md           # Proposed Row Level Security policies and access matrix
│   │   └── PHASE_2A_COMPLETION_REPORT.md             # Formal Phase 2A completion and review report
│   ├── project/                                      # Project management and audit reports
│   │   ├── PROJECT_INSPECTION_REPORT.md              # Project inspection and technology verification report
│   │   ├── SUPABASE_CONNECTION_STATUS.md             # Supabase configuration and readiness audit
│   │   ├── PROJECT_PROGRESS_REGISTER.md              # Comprehensive completed vs incomplete task register
│   │   └── PROJECT_FOLDER_STRUCTURE.md               # Folder structure documentation and directory guide
│   ├── security/                                     # Dedicated security audits and compliance logs
│   └── architecture/                                 # System architecture and workflow diagrams
│
└── supabase/                                         # Future Supabase local configuration (Phase 2B)
    ├── migrations/                                   # Versioned SQL migrations (to be created in Phase 2B)
    └── functions/                                    # Server-side Edge Functions (e.g. send-quote, transcribe)
```

---

## 2. Explanation of Key Directory Purposes

1. **`src/components/common/`:** Houses atom-level reusable presentation components (e.g., loading spinners, status badges, confirmation modals) that are used across multiple CRM pages.
2. **`src/components/layout/`:** Manages CRM chrome and framing: `Sidebar.tsx` (navigation drawer), `Navbar.tsx` (top bar with user avatar and security status badge), and `MainLayout.tsx` (viewport container).
3. **`src/components/ui/`:** Page framing shells like `PageShell.tsx` and resilient error containment like `ErrorBoundary.tsx`.
4. **`src/pages/`:** Top-level view containers corresponding 1:1 with CRM navigation routes.
5. **`src/routes/`:** Routing manifest (`AppRoutes.tsx`) mapping URL paths to page components.
6. **`src/types/`:** Strong TypeScript domain models and interfaces preventing runtime type errors.
7. **`src/lib/`:** Singleton clients for external libraries, specifically reserved for the future `supabase.ts` client.
8. **`src/services/`:** Data-fetching abstractions that decouple React components from direct database queries.
9. **`src/hooks/`:** Custom hooks for reusable stateful logic (e.g. `useAudioRecorder`, `useAuth`, `useQuotes`).
10. **`docs/`:** Organized repository documentation separated into `database`, `project`, `security`, and `architecture`.
11. **`supabase/`:** Reserved for Phase 2B Supabase CLI migrations and Edge Functions.
