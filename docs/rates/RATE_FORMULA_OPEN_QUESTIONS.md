# RATE FORMULA OPEN QUESTIONS & CALCULATION HYPOTHESES
**Window Companies Management System — Pricing & Calculation Verification**  
**Document Code:** `RATE_FORMULA_OPEN_QUESTIONS.md`  
**Date:** November 05, 2026  
**Auditor:** Senior Pricing Systems Analyst  

---

## 1. Safety Directive on Rate Calculations

> [!CAUTION]
> **STRICT REVENUE INTEGRITY RULE:**  
> The CRM engine must **never** invent calculation formulas or assume universal pricing arithmetic without written corporate confirmation.

---

## 2. Unconfirmed Arithmetic Hypotheses

During initial technical discovery, several common hospitality formulas were proposed as working hypotheses:

### Hypothesis 1: Single Occupancy
$$\text{Single Rate} = \text{Double Rate} - \text{Single Deduction}$$
- **Source Document Evidence:**
  - In Mount Randholee (p. 4), Room Only reduction is \$15 from BB, but Single Room price is explicitly stated as \$105 on HB when Double is \$120 (\$15 difference).
  - In Serenique Resort (p. 8), Single is \$100 and Double is \$110 on BB (\$10 difference).
  - In Horton Heights (p. 25), Single is \$150 and Double is \$160 (\$10 difference).
- **Status:** **UNCONFIRMED HYPOTHESIS**. The deduction value varies from \$10 to \$15 depending on hotel and season, and in some properties (Rivendell) it is an independent matrix value (\$35 SGL vs \$40 DBL).

### Hypothesis 2: Bed & Breakfast vs. Half Board
$$\text{BB Rate} = \text{HB Rate} - \text{Dinner Supplement (or BB Deduction)}$$
- **Source Document Evidence:**
  - Mount Randholee lists Dinner Supplement as \$15 per person (p. 4). HB Double is \$120; BB Double is \$105 (\$15 difference).
  - Serenique lists BB Double as \$110 and HB Double as \$120 (\$10 difference).
  - Rivendell lists BB Double as \$40 and HB Double as \$45 (\$5 difference).
  - Pearl Grand lists Room Only as \$45, BB as \$55 (+\$10), and HB as \$70 (+\$15).
- **Status:** **UNCONFIRMED HYPOTHESIS**. Meal increments are property-specific and season-specific.

### Hypothesis 3: Triple Room Calculation
$$\text{Triple Rate} = \text{Double Rate} + \text{Triple Supplement}$$
- **Source Document Evidence:**
  - In Mount Randholee, Summer Double HB is \$120; Triple HB is \$135 (+\$15).
  - In Horton Heights, Winter BB Double is \$160; Triple BB is \$180 (+\$20). Winter HB Double is \$170; Triple HB is \$210 (+\$40).
- **Status:** **UNCONFIRMED HYPOTHESIS**. Triple supplements fluctuate dynamically based on the meal plan (e.g. higher on HB/FB due to three meals).

---

## 3. Explicit Open Questions for Window Companies Management

1. **Excel Master File Ingestion:**  
   Will the company provide the original `.xlsx` rate calculators currently used by the sales team, or should the CRM provide a manual Rate Sheet Editor where staff enter final Red/Green/Yellow prices per room/meal plan?
2. **Formula Rounding Rules:**  
   When calculating net rates or adding taxes, does the company round to the nearest whole dollar (e.g. \$115.00) or keep cents (e.g. \$114.75)?
3. **VAT & SSCL Passthrough:**  
   For hotels where rates are exclusive of VAT/SSCL (e.g. Grand Beragala, Highland Stone House), should the CRM calculate and display the gross rate inclusive of Sri Lankan government taxes (currently 18% VAT + 2.5% SSCL), or should it quote the net rate with an explicit note?
4. **Child & Extra Bed Policies:**  
   Should child extra bed rates be calculated on a percentage discount (e.g. 50% of adult rate) or as flat daily supplements as shown in contracts?

