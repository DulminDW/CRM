# WINDOW COMPANIES CRM — UNRESOLVED BUSINESS QUESTIONS & DESIGN DECISIONS (PHASE 2A REVISED)

**Document Version:** 1.1.0  
**Status Date:** November 02, 2026  
**Classification:** Business Requirements Clarification Request  

To ensure that the CRM strictly reflects real business operations without inventing pricing formulas, permissions, or rules, the following 24 questions have been identified and categorized.

For each item:
- **Why the decision matters:** Technical and commercial impact.
- **Current known information:** What has been confirmed so far.
- **Proposed recommendation:** Suggested engineering approach (PENDING COMPANY APPROVAL).

---

## 1. Rate Calculation & Financial Rules

### Q1: Exact Hotel Rate Calculation Formulas
- **Why it matters:** Whiteboard sketches show base rates (HB Double around 70), supplements (Triple Supplement around 20/30), and reductions (Single Reduction around 5, BB Reduction around 5). Without the exact mathematical formulas, an automated calculation engine cannot be coded.
- **Current known information:** User confirmed calculations are configured per hotel. Whiteboard numbers are illustrative examples only.
- **Proposed recommendation:** Wait until company Excel rate sheets are provided. Do not hard-code formulas in Phase 2A schema; maintain flexible component key/value inputs in `hotel_rate_components`.

### Q2: Currency Scope & Standardization
- **Why it matters:** If one hotel charges in USD and another in LKR or EUR, conversions or multi-currency quotes could be needed.
- **Current known information:** Handover mentions quotes with amount and currency, but does not confirm whether all partner hotels quote in a single uniform currency (e.g. USD).
- **Proposed recommendation:** Support ISO 3-character currency codes per rate sheet and per quote line item (`VARCHAR(3)`). Assume no automatic forex conversion until confirmed.

### Q3: Tax Treatment & Service Charges
- **Why it matters:** In Sri Lankan hospitality, rates may be net (subject to 10% service charge + VAT/SSCL) or all-inclusive gross rates. If quotes omit tax clarity, contractual disputes arise.
- **Current known information:** Tax handling is unmentioned in confirmed notes.
- **Proposed recommendation:** Add a `tax_inclusive` boolean flag on rate components. Defer tax computation until confirmed.

### Q4: Rounding & Decimal Rules
- **Why it matters:** Percentage-based supplements or currency conversions can produce fractional cents (e.g. $55.427).
- **Current known information:** Unconfirmed.
- **Proposed recommendation:** Standard 2-decimal financial rounding (`ROUND(value, 2)`).

### Q5: Rate Units & Occupancy Basis
- **Why it matters:** Pricing could be per room per night, per person per night, or per package.
- **Current known information:** Whiteboard suggests room-based occupancy (Single, Double, Triple).
- **Proposed recommendation:** Model rates as per room per night, noting occupancy type in `room_type`.

---

## 2. Special Rates (Slots 1, 2, 3)

### Q6: Scope of Special Rate Linkage
- **Why it matters:** Handover confirms Special Rates 1, 2, and 3 are agency-specific and negotiated during sales discussions. Does a special rate apply across all hotels, or is it tied to a specific Hotel + Season + Agency?
- **Current known information:** Confirmed agency-specific. Whiteboard links special rates to hotel rows and Date In / Date Out.
- **Proposed recommendation:** Model `agency_special_rates` linked to `(agency_id, hotel_id, season_id, slot_number)`. This allows Jetwing Travels to have Special Rate 1 for Randoli and a different Special Rate 1 for Beragala. **Marked as proposed, pending company sign-off.**

### Q7: Special Rate Amount Basis
- **Why it matters:** Is Special Rate 1 an absolute fixed dollar figure (e.g. $48.00) or a percentage discount off the Green/Normal rate (e.g. 10% off)?
- **Current known information:** Whiteboard and handover state "store the amount, Date In, Date Out, and note".
- **Proposed recommendation:** Store as a fixed monetary `amount` (`NUMERIC(12, 2)`).

---

## 3. Custom Quotes & Distribution

### Q8: Custom Rate Restrictions & Margin Thresholds
- **Why it matters:** A salesperson can choose "Custom" and enter a manual price. If an intern enters $1.00 by accident, the quote could be sent externally.
- **Current known information:** Custom quote choice confirmed. Minimum floor prices or manager approval rules are unconfirmed.
- **Proposed recommendation:** Permit Custom entry without blocking, but log the event in `audit_logs` and flag low margins once floor prices are provided.

### Q9: Full Official Name of H.S.H. Hotel
- **Why it matters:** Partner hotels include Randoli, Beragala, Horton Heights, and H.S.H. 
- **Current known information:** H.S.H. is an abbreviation on the whiteboard.
- **Proposed recommendation:** Store as `"H.S.H."` in `hotels.hotel_name` until company provides full legal name.

---

## 4. Travel Agency Hierarchy & Contact Deduplication

### Q10: Agency Member Email Uniqueness
- **Why it matters:** Imposing a strict global unique constraint (`UNIQUE (email)`) on `agency_members` will cause bulk Excel imports to abort if two contacts share a generic desk email (e.g., `inquiries@jetwing.lk`) or if a person works across two markets.
- **Current known information:** Handover requests duplicate detection.
- **Proposed recommendation:** Do NOT enforce a hard global `UNIQUE(email)` in PostgreSQL. Instead, use a case-insensitive search index (`LOWER(email)`) and build an application pre-flight duplicate warning during manual entry and Excel imports.

### Q11: Member Code Uniqueness & Format
- **Why it matters:** Is member code generated by CRM or imported from agency systems?
- **Current known information:** Unconfirmed.
- **Proposed recommendation:** Optional nullable string (`VARCHAR(50)`).

---

## 5. Hotel Seasons & Overlaps

### Q12: Overlapping Seasonal Validity
- **Why it matters:** Can a hotel have overlapping seasons (e.g. standard "2026 Summer" overlapping with a special "Peak August" season)?
- **Current known information:** Date In and Date Out are relevant to seasons and special rates.
- **Proposed recommendation:** Enforce `date_to >= date_from`. Do not strictly prohibit overlapping dates at the DB level until company clarifies whether sub-seasons exist.

### Q13: Rate Expiry Alerts (PDF Requirement)
- **Why it matters:** The original PDF specified rate-expiry alerts, but later company discussions stated rates are updated manually ~monthly without requiring automated Date In/Date Out alerts.
- **Current known information:** Open question in handover.
- **Proposed recommendation:** Retain seasonal `status IN ('ACTIVE', 'UPCOMING', 'EXPIRED')` in the data model so automated expiry jobs can be activated later if requested.

---

## 6. Legacy DMC / Property Workflow

### Q14: Status of Original PDF DMC / PDF Attachment Requirement
- **Why it matters:** The original PDF plan specified selecting DMCs and emailing rate sheets as PDF/Excel files. The later confirmed workflow specifies sending quotes with rate details in the email body.
- **Current known information:** Handover instructs: "Do not silently delete or merge the older DMC/PDF/Excel workflow."
- **Proposed recommendation:** Separate the two workflows:
  1. Main Agency Workflow: Uses `quotes` with embedded HTML body.
  2. Legacy DMC Workflow: Can be modeled as bulk exports from `hotel_rate_sheets` without polluting the new quote snapshot tables.

### Q15: Contract & Document Upload Scope
- **Why it matters:** Original PDF recommended contract uploads.
- **Current known information:** Unconfirmed.
- **Proposed recommendation:** Defer contract attachment tables until company confirms whether partner hotel contracts or DMC agreements must be stored.

---

## 7. Communication & Email Gateway

### Q16: Approved Email Service Provider & Sender Domain
- **Why it matters:** Email delivery requires an API provider (e.g. Resend, SendGrid, Amazon SES) and domain verification (SPF/DKIM/DMARC) for `@windowcompanies...`.
- **Current known information:** Edge function email dispatch is confirmed; provider is unconfirmed.
- **Proposed recommendation:** Provider API keys will remain server-side in Edge Functions. Company must select an email provider before Phase 5.

### Q17: Sales Team Notification Membership
- **Why it matters:** A fixed internal Sales Team group receives alerts whenever rates are quoted. Who manages this group?
- **Current known information:** Sender does not choose group each time.
- **Proposed recommendation:** Modeled in `sales_team_memberships`. Admins add/remove staff from this notification list.

---

## 8. Team Chat & Voice Notes

### Q18: Chat Channel Management (Archive, Leave, Delete)
- **Why it matters:** Only Admins can create chat groups. Can staff leave groups? Can Admins archive groups?
- **Current known information:** Group creation is Admin-only. Member departure rules unconfirmed.
- **Proposed recommendation:** Include `is_archived` on `chat_groups`. Allow Admins to manage membership rosters.

### Q19: Message Editing & Deletion Rules
- **Why it matters:** In financial/rate discussions, allowing users to edit or delete messages can destroy audit trails.
- **Current known information:** WhatsApp-like chat requested; editing/deletion unconfirmed.
- **Proposed recommendation:** Prevent message deletion by ordinary staff. Retain full audit trail.

### Q20: Voice Recording Retention & Transcription Provider
- **Why it matters:** In-browser audio recording is confirmed. Transcription provider (OpenAI Whisper vs. Google Speech-to-Text), language selection, and audio retention period (e.g. 90 days vs forever) affect storage costs.
- **Current known information:** User chooses language before transcription. Provider unconfirmed.
- **Proposed recommendation:** Store raw audio in private Supabase Storage. Record transcription text in `sales_activity_attachments.transcription_text`. Provider configured server-side later.

---

## 9. Analytics, Visibility & Quote Lifecycle

### Q21: Analytics Excel Export
- **Why it matters:** PDF export is confirmed. Excel export for the Analytics tab is unconfirmed.
- **Current known information:** PDF export confirmed.
- **Proposed recommendation:** The database schema supports fast aggregations. Excel export can be enabled in Phase 7 if requested.

### Q22: Quote Visibility Between Sales Staff
- **Why it matters:** Can salesperson A view quotes generated by salesperson B?
- **Current known information:** Handover states: "A rate given by one staff member is visible to other company staff members, subject to permissions."
- **Proposed recommendation:** Staff can view all quotes sent to agencies to prevent contradictory quotes.

### Q23: Customer PII Retention Policy
- **Why it matters:** GDPR / local privacy compliance regarding contact details of agency personnel.
- **Current known information:** Internal business contact details only.
- **Proposed recommendation:** Support soft-delete status (`status = 'INACTIVE'`) on `agency_members` rather than hard DELETE, preserving historical quote integrity.

### Q24: Quote Draft Editing Window Prior to Dispatch
- **Why it matters:** Can an employee save an un-sent quote draft, resume editing it later, or delete it?
- **Current known information:** Handover specifies quote created and sent.
- **Proposed recommendation:** Explicitly model `quote_lifecycle IN ('DRAFT', 'DISPATCHED', 'CANCELLED')`. Edits permitted in `DRAFT`; once `DISPATCHED`, line items and recipients are permanently locked.
