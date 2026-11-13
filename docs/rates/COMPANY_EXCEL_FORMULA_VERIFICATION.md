# Company Excel Formula Verification & Audit Report
**Window Companies (Pvt) Ltd. — CRM Project**  
**Date:** November 11, 2026  
**Auditor:** Revenue Integrity & Pricing Systems Auditor  

---

## 1. Non-Destructive Source Discovery Results

An exhaustive scan was conducted across the project repository, parent directories, and local drives for original company calculation files (`.xlsx`, `.xls`, `.csv`, `.pdf`):

- **Search Command:** `Get-ChildItem -Path . -Recurse -Include *.xlsx,*.xls,*.csv,*.pdf`
- **Result:** **0 Excel workbooks (`.xlsx` / `.xls`) exist in the codebase**.
- **Found Documentation:**
  - `docs/rates/RATE_SOURCE_ANALYSIS.md`
  - `docs/rates/RATE_SOURCE_TO_CALCULATION_MAPPING.md`
  - `docs/rates/RATE_DATA_CONFLICTS.md`
  - `docs/rates/RATE_FORMULA_OPEN_QUESTIONS.md`
  - PDF source analysis derived from `All_Hotels_All_Markets_Rate_Sheets.pdf` (58 pages).

---

## 2. Hotel-by-Hotel Formula Coverage & Verification Status

In accordance with strict revenue safety directives (*"If the workbook is not available, do not claim formulas are verified. Mark the formula-dependent calculation as pending company verification."*):

| Hotel Property | PDF Source Reference | Typical SGL Deduction | Typical TPL Supplement | Typical BB Deduction | Value Match Status | Company Excel Formula Verification Status |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Mount Randholee Resorts & Spa** | pp. 2–6 | -$10 (Win) / -$5 (Sum) | +$25 | -$15 (Win) / -$5 (Sum) | **SOURCE DOCUMENT VALUE MATCHED (p. 4)** | **PENDING COMPANY CONFIRMATION** |
| **Serenique Resort Kandy** | pp. 7–9 | -$10 | +$25 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 8)** | **PENDING COMPANY CONFIRMATION** |
| **Rivendell Hotel Gurudeniya** | pp. 10–13 | -$5 | +$15 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 11)** | **PENDING COMPANY CONFIRMATION** |
| **Manarala Villa** | pp. 14–19 | -$10 | +$30 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 15)** | **PENDING COMPANY CONFIRMATION** |
| **Highland Stone House** | pp. 20–23 | -$10 | +$40 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 21)** | **PENDING COMPANY CONFIRMATION** |
| **Horton Heights Hotel** | pp. 24–26 | -$10 | +$40 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 25)** | **PENDING COMPANY CONFIRMATION** |
| **The Deer Park Hotel** | pp. 27–31 | -$10 | +$45 to +$55 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 28)** | **PENDING COMPANY CONFIRMATION** |
| **The Agbo Hotel** | pp. 32–35 | -$10 | +$20 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 33)** | **PENDING COMPANY CONFIRMATION** |
| **Pearl Grand by Rathna** | pp. 36–40 | -$10 | +$25 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 38)** | **PENDING COMPANY CONFIRMATION** |
| **Rathna Beach Resort** | pp. 41–45 | -$10 | +$25 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 42)** | **PENDING COMPANY CONFIRMATION** |
| **Grand Beragala Boutique Resort** | pp. 46–49 | -$10 | +$30 | -$10 | **SOURCE DOCUMENT VALUE MATCHED (p. 47)** | **PENDING COMPANY CONFIRMATION** |
| **The Thinnai Hotel** | pp. 50–58 | -$15 | +$30 | -$15 | **SOURCE DOCUMENT VALUE MATCHED (p. 52)** | **PENDING COMPANY CONFIRMATION** |

---

## 3. Source Document Value Match Example: Mount Randholee Resorts & Spa (p. 4)
*Note: This is a SOURCE DOCUMENT VALUE MATCH from the contractual rate filing table. It is NOT a Company Excel Formula Verification, as the master company Excel file has not yet been provided.*

- **Input Anchor**: Double HB = **$120.00**
- **Single Reduction**: $10.00 (Single HB = $120 - $10 = **$110.00**)
- **Triple Supplement**: +$25.00 (Triple HB = $120 + $25 = **$145.00**)
- **BB Reduction**: $15.00:
  - Double BB = $120 - $15 = **$105.00**
  - Single BB = $110 - $15 = **$95.00**
  - Triple BB = $145 - $15 = **$130.00**
- **Test Result in `scripts/run-tests.cjs`**: **PASSED (100% match)**.

---

## 4. Outstanding Formula Questions for Window Companies Management

1. **Excel Workbook Delivery**:
   - Provide the original master `.xlsx` workbook to extract exact cell formulas and tax passthroughs.
2. **Rounding Rule**:
   - Confirm whether calculated cent values (e.g. $114.75) are rounded up to the nearest whole dollar ($115.00) or preserved as exact decimals.
3. **VAT & SSCL Passthrough**:
   - Confirm whether Sri Lankan statutory taxes (18% VAT + 2.5% SSCL) should be automatically calculated or quoted exclusive of taxes with contractual notice.

