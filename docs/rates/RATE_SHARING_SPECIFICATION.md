# WINDOW COMPANIES MANAGEMENT SYSTEM — RATE SHARING SPECIFICATION

**Document Version:** 1.0.0  
**Date:** November 05, 2026  
**Scope:** Multi-step Rate Sharing wizard, hierarchical recipient binding, special conditions, and immutable quote preservation  

---

## 1. End-to-End Workflow Pipeline

The Rate Sharing workflow executes in 11 sequential steps:
1. **Select Hotel:** Partner hotel from `hotels` table.
2. **Select Season:** Seasonal validity calendar from `hotel_seasons` table.
3. **Select Contract or Rate Sheet:** Active contract from `hotel_contracts` or standard rate sheet.
4. **Select Pricing Tier:** Standard Category (`RED = Lowest`, `GREEN = Normal`, `YELLOW = Highest`) or Custom Template (`Custom 1, 2, 3`).
5. **Select Parent Agency:** Chooses target DMC / Travel Agency from `travel_agencies`.
6. **Filter Markets:** Selects relevant regional market desks (e.g. India Desk, Europe Desk).
7. **Select Individual Contacts:** Checkbox selection of verified contacts from `agency_members`, with Select All / Deselect All and duplicate email deduplication.
8. **Add Special Conditions:** Volume commitments (e.g. 1500 room nights), minimum night restrictions, blackout periods.
9. **Add Staff Notes:** Clarifications regarding meal plans (HB/BB), tax inclusion, and booking windows.
10. **Preview Email:** Formats an interactive HTML preview displaying hotel, season, quoted tiers, conditions, and recipient list.
11. **Save Immutable Quote Snapshot:** Persists the header in `quotes`, recipient snapshot in `quote_recipients`, and frozen pricing line items in `quote_items`.

---

## 2. Invariants & Data Integrity Guarantees

1. **Email Deduplication:** If the same email exists across multiple desk assignments, the recipient selector strictly deduplicates entries to prevent sending duplicate rate emails to the same contact.
2. **Frozen Recipient Snapshot:** Future edits to `agency_members` (e.g., job title or email updates) DO NOT alter historical quote records.
3. **Frozen Pricing Snapshot:** Future changes to hotel contracts or base rate sheets DO NOT alter the `quoted_amount` preserved in `quote_items`.
4. **Confidentiality:** Internal cost calculations, color tier labels, and margins are stripped from customer-facing text representations.

