# WINDOW COMPANIES MANAGEMENT SYSTEM — RATE WORKFLOW SPECIFICATION

**Document Version:** 1.0.0  
**Date:** November 05, 2026  
**Scope:** Rate lifecycle, versioning state machine, and custom rate template reuse  

---

## 1. Rate Lifecycle States

```
      ┌───────────┐
      │   DRAFT   │ ──► Modifiable by staff with CAN_MANAGE_RATES.
      └─────┬─────┘
            │ Admin Publication
            ▼
      ┌───────────┐
      │ PUBLISHED │ ──► Locked. Active rate source for quotes & proposals.
      └─────┬─────┘
            │ Superseded by next version
            ▼
      ┌───────────┐
      │ ARCHIVED  │ ──► Preserved permanently for historical audit.
      └───────────┘
```

---

## 2. Custom Rate Templates (Custom 1, Custom 2, Custom 3)

The company uses three custom rate slots:
- **`Custom 1`**: Negotiated high-volume commercial rate.
- **`Custom 2`**: Preferred partner incentive rate.
- **`Custom 3`**: Promotional or seasonal deal rate.

### Reusability Rules:
1. Created with explicit room-night conditions (e.g. 1500 room nights commitment).
2. Available for immediate selection during the Rate Sharing wizard (`/share-rates`).
3. Changes to a custom template do not affect previously saved quote snapshots.

