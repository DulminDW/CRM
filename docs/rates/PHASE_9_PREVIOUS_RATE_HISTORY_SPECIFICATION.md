# Phase 9: Previous Rate History Specification & Snapshot Integrity
**Window Companies (Pvt) Ltd. — CRM Project**  
**Date:** November 11–12, 2026 (Phase 9)  

---

## 1. Overview & Business Objective
When sales representatives or account managers open an agency or member profile, they need instant visibility into previously shared quotes.

---

## 2. Cross-Module Entry Points
- **From Travel Agencies (`/agencies`)**: An interactive **History icon** (`History`) on each agency row routes directly to `/rates?agencyId={agency_id}&tab=HISTORY`.
- **From Members (`/members`)**: A **History icon** on each contact row routes to `/rates?memberId={member_id}&tab=HISTORY`.
- **From Rate Management Hub (`/rates`)**: The **Rate History** tab allows searching and filtering across all quotes.

---

## 3. Historical Snapshot Integrity Guarantee
Previously shared quotes MUST remain completely unaffected by subsequent changes to:
- Hotel rate sheets or component adjustments.
- Contract versions or amendments.
- Calculation setup rules.
- Agency contact email or address modifications.

### Technical Implementation:
Quotes freeze complete line item snapshots in `quote_items`:
- `hotel_name_snapshot`
- `season_label_snapshot`
- `contract_reference_snapshot` (e.g. `CTR-SIG-2026-001 (v1.0)`)
- `room_type_snapshot`
- `meal_plan_snapshot`
- `quoted_amount`
- `currency`
- `custom_notes`
All displayed historical records query these immutable snapshot columns directly, guaranteeing 100% historical accuracy.

