# Phase 9: Security & Permissions Review
**Window Companies (Pvt) Ltd. — CRM Project**  
**Date:** November 11–12, 2026 (Phase 9)  

---

## 1. Permission Matrix

| Role / Capability | View Rates / History | Edit Rates & Components | Create Custom 1/2/3 | Save Outgoing Quotes | Access Internal Notes |
|---|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | Yes | Yes | Yes | Yes | Yes |
| **STAFF (with `CAN_MANAGE_RATES`)** | Yes | Yes | Yes | Yes | Yes |
| **STAFF (without permission)** | Yes (View Only) | No | No | Yes | No |
| **External / Unauthenticated** | No | No | No | No | No |

---

## 2. Row Level Security Policies (Draft Migration 000014)

1. **`hotel_rate_configs`**:
   - `SELECT`: `public.is_active_employee()`.
   - `INSERT / UPDATE / DELETE`: `public.can_manage_rates()`.
2. **`quotes` / `quote_items`**:
   - `SELECT`: Authenticated active employees can inspect quote history.
   - `INSERT`: Authenticated staff can save quote snapshots.
   - `UPDATE / DELETE`: Forbidden. Quotes are strictly append-only.

---

## 3. Privacy Shield
- `is_internal_only` on conditions prevents private contractor margins from leaking into client proposals.
- Master contract `internal_notes` are explicitly stripped from email previews and quote line items.

