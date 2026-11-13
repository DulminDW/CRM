# WINDOW COMPANIES MANAGEMENT SYSTEM — COMPANY RATE EXCEL WORKBOOK DISCOVERY & ANALYSIS REPORT

**Report Date:** November 05, 2026  
**Investigator:** Senior Full-Stack Engineer & Database Architect  
**Scope:** Search, discovery, and technical formula extraction from company-provided rate workbooks  

---

## 1. Executive Summary

A comprehensive, non-destructive file search was conducted across the entire project workspace (`c:\Users\Nethshan Dulmin\Desktop\CRM`) for company-provided rate workbooks (`.xlsx`, `.xls`, `.csv`), rate sheets, seasonal rate matrices, calculation templates, and related PDF documents.

### Discovery Outcome
**NO EXCEL WORKBOOKS OR RATE SHEETS WERE FOUND IN THE PROJECT WORKSPACE.**
- Search Patterns: `*.xlsx`, `*.xls`, `*.csv`, `*.pdf`, `*.png`, `*.jpg`, `*.jpeg`
- Scanned Directories: Root, `docs/`, `src/`, `src/assets/`, `scripts/`, `supabase/`
- Only existing non-code media found: `src/assets/hero.png` (branding image)

Per the strict safety rules of Phase 6:
> *"If no Excel files are found, do NOT invent sample company data or formulas. Create a missing-document report... mark all unverified calculations as NOT CONFIRMED."*

---

## 2. Workbook Information Currently Missing

The following documents must be supplied by the company before any automated mathematical calculation engine is codified into production:

| Required Document | Expected Contents | Associated Hotel(s) | Impact on System |
|---|---|---|---|
| **Contract Rate Sheets (.xlsx)** | Master room pricing matrices, meal plan supplements, base prices | Randoli, Beragala, Horton Heights, H.S.H. | Required to verify exact cell formulas for Single, Double, Triple across BB and HB. |
| **Seasonal Calendar Matrix** | Dates, room allocations, high/low/peak seasons | All partner hotels | Required to verify season names and validity periods. |
| **Commercial Tiering Rules** | Definition of RED, GREEN, YELLOW tiers | Company-wide commercial policy | Required to confirm whether tiers represent margins, seasons, or market classes. |
| **Special Rates Matrix** | Special Rate 1, 2, 3 guidelines and discount logic | VIP / Tier 1 Agencies | Required to confirm whether Special Rates are fixed sums or percentage discounts. |

---

## 3. High-Priority Questions for Company Confirmation

To finalize the rate calculation engine, the company must provide answers to the following:

1. **Exact Mathematical Relationships:**
   - How is **Single** calculated from **HB Double Base**? (Is it `Double / 2 - Single Reduction`, or `Double - Single Reduction`, or another formula?)
   - How is **Triple** calculated? (Is it `Double + Triple Supplement`, or `(Double * 1.5) + Supplement`, or another formula?)
   - How is **BB** calculated from **HB**? (Is it `HB - BB Reduction`, or is BB calculated per person or per room?)
2. **Pricing Unit:**
   - Are the base rates quoted **per room per night**, or **per person per night**?
3. **Currency & Taxes:**
   - What is the default currency? (USD, LKR, EUR, or property-specific?)
   - Are prices inclusive or exclusive of VAT, Service Charge (10%), and Tourist Development Levy (TDL)?
4. **Rate Tier Semantics:**
   - The agreed color mapping is:
     - `RED = LOWEST`
     - `GREEN = NORMAL`
     - `YELLOW = HIGHEST`
   - What determines whether a quote uses Red, Green, or Yellow? (Market volume, season, or manual operator selection?)

