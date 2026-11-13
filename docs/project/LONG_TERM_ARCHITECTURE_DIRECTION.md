# WINDOW COMPANIES MANAGEMENT SYSTEM — LONG-TERM MULTI-MODULE ARCHITECTURE REVIEW

**Document Date:** November 05, 2026  
**Auditor:** Lead Systems Architect, Supabase & Security Engineer  
**Classification:** Strategic Architectural Assessment & Multi-Module Roadmap  
**Target Platform:** Window Companies Management System (Enterprise Platform)  
**Current Active Module:** Booking / Operations / CRM Module  
**Prospective Future Modules:** HR Management, Accounts Management, Company Operations  

---

## 1. Executive Summary

This architecture review assesses the existing WINDOW COMPANIES CRM codebase, database design, authentication mechanisms, and UI structures against the long-term goal of serving as the initial module within an expandable, company-wide management platform.

### Core Verdict
The existing system possesses **strong foundational decoupling** at the core infrastructure layer:
- Authentication is cleanly centralized through Supabase GoTrue.
- User identities and company staff profiles are cleanly separated from external entities (`user_profiles` vs. `agency_members`).
- System-wide capabilities (`audit_logs`, `notifications`, `user_permissions`) are built generically.
- Booking and CRM business entities (`travel_agencies`, `agency_markets`, `hotels`, `hotel_seasons`, `hotel_rate_sheets`, `quotes`) are already strictly modularized and do not contaminate global user state.

With minor forward-compatible governance (detailed in this report), the platform will readily accommodate future independent modules such as **HR Management** and **Accounts Management** without rewriting the Booking/CRM module or breaking existing functionality.

---

## 2. Evaluation of Existing Architectural Strengths

| Architectural Layer | Existing Implementation | Multi-Module Advantage |
|---|---|---|
| **Identity & Authentication** | Supabase Auth (`auth.users`) + `public.user_profiles` | Single Sign-On (SSO) across all current and future modules. Internal company personnel have one single login identity. |
| **Separation of Staff vs. Contacts** | `user_profiles` (5–15 internal employees) vs. `agency_members` (external travel contacts) | HR and Accounts modules will never have external agency contacts polluting internal personnel directories. |
| **Audit Logging Foundation** | `public.audit_logs` using generic target references (`target_table`, `target_record_id`, `JSONB` diffs) | Any future module (HR payroll, Accounts invoicing) can write immutable audit events into this shared ledger without schema changes. |
| **System Notifications** | `public.notifications` keyed to `user_id` with metadata JSONB | Shared notification bell can display Booking alerts, HR announcements, or Accounts payment approvals seamlessly. |
| **Declarative UI Routing** | React Router 6.4+ declarative structure wrapped in modular layout | Adding `/hr/*` or `/accounts/*` route trees can be done via independent route bundles without altering `/agencies` or `/hotels`. |
| **Granular Capability RBAC** | `public.user_permissions` table keyed on `permission_key` | Permissions are capability-based rather than hardcoded monoliths, allowing module-scoped authorization keys. |

---

## 3. Coupling & Limitations That Require Long-Term Consideration

While the current foundation is sound, the review identified four architectural boundaries that should be treated thoughtfully as the platform evolves:

### 3.1. Permission Key Constraints (`chk_permission_key`)
- **Current State:** The database constraint on `public.user_permissions` restricts keys to:
  ```sql
  CONSTRAINT chk_permission_key CHECK (permission_key IN ('CAN_MANAGE_RATES', 'CAN_MANAGE_USERS', 'CAN_CREATE_CHAT_GROUPS'))
  ```
- **Architectural Impact:** The permission table itself is completely modular and shared, but the explicit `CHECK` constraint lists Booking-specific permissions.
- **Future Module Path:** When HR or Accounts modules are designed, module-specific permissions (e.g., `HR_VIEW_PAYROLL`, `ACCOUNTS_APPROVE_INVOICE`) can either be added via standard sequential migrations or migrated to namespaced keys (`MODULE:ACTION`). No action is needed or recommended now.

### 3.2. Single Top-Level Navigation Sidebar
- **Current State:** `Sidebar.tsx` currently arranges navigation items under Booking-focused sections: *Overview*, *Agencies & Contacts*, *Hotels & Pricing*, *Distribution & Sales*, *Communication*, and *Intelligence & Admin*.
- **Architectural Impact:** If future modules add dozens of links to this single sidebar, navigation could become visually crowded.
- **Future Module Path:** When future modules are introduced, the platform can easily introduce a top-level **App / Module Switcher** (e.g., [Booking CRM] | [HR] | [Accounts]) or collapsible module-level sidebar groups. No change is required today.

### 3.3. Database Schema Namespace (`public` schema)
- **Current State:** All 26 Booking/CRM tables currently reside in the `public` PostgreSQL schema.
- **Architectural Impact:** While standard for Supabase, having 50–70 tables from multiple disparate departments in a single `public` schema could cause naming collisions in the distant future.
- **Future Module Path:** Future modules can either use clean table prefixes (e.g., `hr_employees`, `acc_invoices`) or separate PostgreSQL schemas (`hr.*`, `accounts.*`). The existing Booking tables require zero alterations.

---

## 4. Shared Foundations to Maintain Across All Modules

The following elements must remain common, shared, and globally consistent across the entire platform:

```
                            ┌──────────────────────────────────┐
                            │      Supabase Auth (SSO)         │
                            │       (auth.users)               │
                            └─────────────────┬────────────────┘
                                              │
                            ┌─────────────────▼────────────────┐
                            │    Shared User Identity          │
                            │   (public.user_profiles)         │
                            └────┬────────────┬───────────┬────┘
                                 │            │           │
       ┌─────────────────────────┘            │           └──────────────────────────┐
       ▼                                      ▼                                      ▼
┌───────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────────┐
│   Shared Foundations      │  │  Active Booking / CRM     │  │  Future Modules          │
│ • user_permissions (RBAC) │  │ • travel_agencies         │  │ • HR Management          │
│ • audit_logs (Ledger)     │  │ • agency_markets/members  │  │   (Employees, Leave, etc)│
│ • notifications (Bell)    │  │ • hotels & hotel_seasons  │  │ • Accounts Management    │
│ • App Layout & Shell      │  │ • hotel_rate_sheets       │  │   (Invoices, Ledger, etc)│
│                           │  │ • quotes & rate outputs   │  │                          │
└───────────────────────────┘  └───────────────────────────┘  └──────────────────────────┘
```

1. **Unified Identity (`user_profiles`):** An employee in Window Companies is the same person whether they are a travel agent, HR manager, or accountant.
2. **Unified Audit Ledger (`audit_logs`):** Security and compliance mandate that administrative actions across all departments write to one tamper-resistant audit table.
3. **Unified Communications Shell (`notifications`):** A centralized notification bell keeps internal employees informed without needing separate apps.

---

## 5. Genuine Near-Term Action Items vs. Postponed Decisions

### Genuine Near-Term Actions: **NONE REQUIRED**
- **Zero code changes or database migrations are necessary today.**
- The existing Booking/CRM module is clean, decoupled, and does not leak domain-specific logic into `auth.users` or `user_profiles`.
- RLS policies and table constraints are self-contained within the CRM tables.

### Decisions Strictly Postponed Until Future Module Approval:
1. **Do not create placeholder tables** for HR (e.g. employee contracts, leave requests) or Accounts (e.g. ledger entries, charts of accounts).
2. **Do not modify the `user_permissions` check constraint** until authorized permission lists for new modules are officially defined.
3. **Do not add fake sidebar tabs or routes** for non-existent modules.
4. **Do not introduce micro-frontend or monorepo tooling prematurely.** The current Vite + React structure supports clean folder partitioning (`src/modules/booking`, `src/modules/hr`) when the time comes.

---

## 6. Conclusion & Recommendation

The existing WINDOW COMPANIES CRM architecture is **fully capable of supporting long-term expansion** into an enterprise management platform. The architectural separation between core platform identities and Booking domain entities is robust.

**Immediate Next Step:** Maintain focus strictly on the Booking / Operations / CRM roadmap (Phase 6: Rate Calculation Engine & Special Rates). No architecture refactoring is needed.

