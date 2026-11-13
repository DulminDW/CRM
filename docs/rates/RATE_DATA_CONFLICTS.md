# RATE DATA CONFLICTS & SOURCE DISCREPANCIES
**Window Companies Management System — Audit of Original Partner Hotel Filings**  
**Document Code:** `RATE_DATA_CONFLICTS.md`  
**Date:** November 05, 2026  
**Auditor:** Quality Assurance & Revenue Auditor  

---

## 1. Discrepancy Inventory & Impact

Across the 58 pages of `All_Hotels_All_Markets_Rate_Sheets.pdf`, several direct data discrepancies, naming conflicts, and typographical anomalies exist in the original hotel rate contracts.

In accordance with strict system integrity directives, **none of these original values have been silently altered or normalized** in the database:

| Conflict ID | Hotel Property | Source Location | Discrepancy / Data Conflict | Operational Risk & Handling |
| :---: | :--- | :--- | :--- | :--- |
| **DC-01** | Mount Randholee Resorts & Spa | p. 3 | Lists Hotel Currency as `LKR / USD`, but all table rates are quoted in US Dollars with a note: *"Rates are in USD and non-commissionable"*. | Potential currency ambiguity. CRM defaults to `USD` while preserving source note. |
| **DC-02** | Serenique Resort Kandy | p. 8 | Lists peak date supplement twice with overlapping dates: `( $10 per room supplement 01.01.2026 – 10.01.2026 / 20.12.2026 – 10.01.2027 )`. | Risk of applying double peak supplement for Jan 1–10. Flagged for clarification. |
| **DC-03** | Highland Stone House | p. 21 | Date ranges state: `Rate Period - 1st July 2026 to 31st October 2026` followed by a supplement: `A supplement of $15PR will be charged on 1st of July 2026 to 31st of August 2026`. | Overlapping seasonal supplement within standard summer dates. Handled as an ad-hoc supplement, not a separate season. |
| **DC-04** | The Agbo Hotel | p. 33 | Typo in official contract document: `Summer - 1st of May 2026 to 31st of Octomber 2026`. | Spelling preserved as in source contract; date boundaries parsed accurately as `2026-10-31`. |
| **DC-05** | Pearl Grand by Rathna | p. 37 | Official contact email printed as `reservations@pearlgranf.lk` alongside `info@pearlgrand.lk`. | Preserved original text in contract record; verified domain email is `pearlgrand.lk`. |
| **DC-06** | Manarala Villa | p. 15 | Rate sheet lists `All Market Winter / Summer (2025/2026)` starting from `01.08.2025`, but the CRM active scope is forward-facing 2026/2027. | Prior-year contract filing. Flagged for updated 2026/27 contract collection. |
| **DC-07** | The Thinnai Hotel | p. 51, 55 | Quotes forward validity: `Contract Period 1st of April 2027 to 2028`. | Forward 2027/28 contract period. Handled cleanly by date-range parser. |

---

## 2. Recommendation for Operational Handover
- Maintain these exact original notes in the `terms_and_conditions` column of `public.hotel_contracts`.
- Never silently correct vendor dates or emails in contractual records without counter-party signed addenda.

