# OPEN BUSINESS QUESTIONS & POLICY DECISIONS
**WINDOW COMPANIES MANAGEMENT SYSTEM**  
*Rule:* Do NOT invent company policy, rate formulas, tax rates, or commercial conditions without official confirmation.  
*Version:* 2.0.0 — November 13, 2026

---

## 1. Rate Engine & Formula Architecture

1. **Exact Hotel Calculation Formulas:**
   - *Current Implementation:* Supports standard HB Double base with single reduction, triple supplement, and BB reduction components, alongside the 13 verified Excel calculation scenarios in `scripts/run-tests.cjs`.
   - *Question for Management:* What are the exact mathematical formulas used by each of the 12 partner hotels? Are deductions calculated as fixed amounts (e.g., -$20) or percentage-based reductions (e.g., -15%)?
2. **Pricing Basis & Currency Defaults:**
   - *Current Implementation:* Default currency is USD with 2 decimal places. Quoted on a per-room-per-night Half Board (HB) basis.
   - *Question for Management:* Are any properties priced on a per-person sharing basis or in LKR/EUR? Are local government taxes (VAT, SSCL, TDL) included in the base rate or calculated on top as an invoice supplement?
3. **Contract Rate Category vs Standard Tiers:**
   - *Current Implementation:* Contract rate is treated as the official signed master reference price (e.g., 100), from which `RED` (lowest / high-volume floor, e.g., 60), `GREEN` (commercial normal, e.g., 70), and `YELLOW` (highest ceiling, e.g., 65) tiers are categorized.
   - *Question for Management:* Can a quote combine multiple rate tiers across different properties, or must all hotels in a single rate email share the same tier?

---

## 2. Deal Conditions & Room-Night Commitments

4. **Room-Night Eligibility & Enforcement:**
   - *Current Implementation:* Quoted emails allow adding custom conditions (e.g., *"Minimum 1,500 room nights commitment required for $50 rate"*).
   - *Question for Management:* Is room-night volume tracked automatically against actual bookings in the CRM, or is it purely a contractual clause printed on quotes?
5. **Custom Rates (1, 2, 3) vs Special Rates (1, 2, 3):**
   - *Current Implementation:* Kept as two distinct business structures:
     - `Custom Rate 1, 2, 3`: Commercial templates with volume conditions.
     - `Special Rate 1, 2, 3`: Agency-specific VIP negotiated slots tied to specific partners.
   - *Question for Management:* Does management confirm that Custom Rates and Special Rates remain two independent systems, or should they be unified into a single pricing template library?

---

## 3. Communication, Documents & External Services

6. **Email Transmission & Sending Domain:**
   - *Current Implementation:* Uses client-side device handoff (`mailto:` and "Continue in Gmail"), completely avoiding the exposure of server API keys in client code.
   - *Question for Management:* Does Window Companies plan to integrate a centralized transactional email provider (such as Resend or SendGrid) for automated server-side email delivery? If yes, what is the verified sending domain and DKIM/SPF authorization status?
7. **Rate Sheet Attachments (PDF / Excel):**
   - *Current Implementation:* Generates full plain-text and HTML formatted email bodies containing rate tables and conditions.
   - *Question for Management:* Is automated server-side PDF generation required for rate distributions, or is the plain-text/HTML body handoff to Gmail/Outlook sufficient?
8. **Contract Document Uploads:**
   - *Current Implementation:* Uses private Supabase Storage bucket `contract-documents` for PDF/Word files up to 25MB.
   - *Question for Management:* Are digital e-signatures (e.g. DocuSign/Adobe Sign) required, or is storing signed scanned PDF copies sufficient?

---

## 4. Operational Collaboration & Sales Activities

9. **Employee Task Assignment Rules:**
   - *Current Implementation:* Task assignments are planned in architecture.
   - *Question for Management:* Can any employee assign tasks to any other employee, or is task assignment strictly hierarchical (Admin/Manager &rarr; Staff)?
10. **Voice Note Transcriptions & Language Support:**
    - *Current Implementation:* Voice recording interface planned for Sales Activities.
    - *Question for Management:* Which audio formats and spoken languages (English, Sinhala, Tamil) must be supported for speech-to-text transcription? What transcription service is preferred?
11. **Team Chat Group Permissions:**
    - *Current Implementation:* Group chat planned under permission `CAN_CREATE_CHAT_GROUPS`.
    - *Question for Management:* Should agency contact discussions be organized by Agency channels, Hotel channels, or open employee topic channels?

