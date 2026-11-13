# WINDOW COMPANIES MANAGEMENT SYSTEM — RATE BUSINESS DECISIONS REGISTER

**Date:** November 05, 2026  
**Status:** Open Business Decisions Register for Rate Management  
**Scope:** Policy decisions required from company leadership before Phase 7  

---

## 1. Decision Register

| ID | Topic | Technical Dilemma | Recommended Option | Company Decision Required |
|---|---|---|---|---|
| **BD-RATE-01** | **Currency Scope** | Can different partner hotels quote in different currencies (e.g. Randoli in USD, Beragala in LKR)? | Default to ISO 3-letter currency code per `hotel_rate_sheets` (`USD` default, configurable per sheet). | Confirm whether multi-currency is required across hotels. |
| **BD-RATE-02** | **Tax Inclusivity** | Are room rates inclusive or exclusive of local statutory taxes (VAT, Service Charge 10%, TDL)? | Store net base rates in database, and display tax policy explicitly in quote footnotes. | Confirm whether quoted prices include taxes or if taxes are added at checkout. |
| **BD-RATE-03** | **Occupancy Unit** | Are rates quoted per person per night (PPPN) or per room per night (PRPN)? | Standard resort convention in Sri Lanka for HB/BB is per room for Double, but reductions may be per person. | Provide exact calculation rules per occupancy. |
| **BD-RATE-04** | **Special Rates 1, 2, 3 Hierarchy** | Handover states Special Rates 1–3 are agency-specific, but does a special rate apply to a specific Hotel, a Season, or a Room Type? | Model `agency_special_rates` linking `(agency_id, hotel_id, season_id, slot_number)` where slot is 1, 2, or 3. | Confirm exact scoping of Special Rates 1, 2, and 3. |
| **BD-RATE-05** | **Rate Publication Workflow** | Who is authorized to transition a rate sheet from `DRAFT` to `PUBLISHED`? | Restrict publication to `ADMIN` only; allow authorized `STAFF` to draft rate sheets. | Confirm whether Staff with `CAN_MANAGE_RATES` can publish directly. |
| **BD-RATE-06** | **Decimal Precision & Rounding** | What rounding rule should apply to calculated rates (round to nearest dollar, round up, two decimals)? | Standard `NUMERIC(12, 2)` rounded to nearest 2 decimal places. | Confirm if rates must be rounded to nearest whole integer or cent. |

