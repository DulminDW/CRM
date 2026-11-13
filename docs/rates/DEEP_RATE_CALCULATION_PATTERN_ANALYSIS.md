# DEEP RATE CALCULATION PATTERN ANALYSIS
**Window Companies Management System — Mathematical & Structural Analysis**  
**Source Document:** `All_Hotels_All_Markets_Rate_Sheets.pdf` (58 Pages, 12 Partner Hotels)  
**Date:** November 05, 2026  
**Auditor / Role:** Principal Systems Architect & Hospitality Revenue Engineer  

---

## 1. Executive Summary & Core Discovery

The objective of this deep analysis is to determine how a full 12-cell rate matrix:
- **Occupancies (Rows):** Single, Double, Triple, Quadruple
- **Meal Plans (Columns):** BB (Bed & Breakfast), HB (Half Board), FB (Full Board)

can be derived automatically when a salesperson inputs a single anchor base price, such as **Double HB**.

### The Decisive Finding:
> [!IMPORTANT]
> **NO UNIVERSAL CALCULATION FORMULA EXISTS ACROSS SRI LANKAN PARTNER HOTELS.**  
> An analysis of all 12 partner hotels across their seasonal filings reveals that hotels do **not** share identical deduction or supplement values. Furthermore, even within a single hotel property, adjustments vary across seasons (e.g. Mount Randholee Single HB deduction is \$5 in Summer, but \$10 in Winter).
> 
> However, **every individual hotel follows an internally consistent 2-axis delta matrix (Occupancy Step + Meal Step)**.  
> Therefore, the correct architectural solution is **Option D: Saved Custom Calculation Templates with Configurable Adjustments**, allowing up to five user-named templates with manual override capability before saving.

---

## 2. In-Depth Hotel-by-Hotel Calculation Patterns

### 2.1 Mount Randholee Resorts & Spa (PDF Page 3)
- **Summer 2026 Table (Superior Deluxe):**
  - Base: **Double HB = \$85**
  - **Occupancy Deltas (from Double HB):**
    - Single HB = \$80 &rarr; **-$5**
    - Triple HB = \$110 &rarr; **+\$25**
  - **Meal Plan Deltas (relative to HB):**
    - For Double: BB is \$80 (-$5); FB is \$100 (+$15).
    - For Single: BB is \$70 (-$10); FB is \$90 (+$10).
    - For Triple: BB is \$100 (-$10); FB is \$130 (+$20).
- **Winter 2026/27 Table (Superior Deluxe):**
  - Base: **Double HB = \$100**
  - **Occupancy Deltas (from Double HB):**
    - Single HB = \$90 &rarr; **-$10** (Changed from Summer's -$5!)
    - Triple HB = \$125 &rarr; **+\$25** (Maintained)
  - **Meal Plan Deltas (relative to HB):**
    - For Double: BB is \$90 (-$10); FB is \$115 (+$15).
    - For Single: BB is \$85 (-$5); FB is \$110 (+$20).
    - For Triple: BB is \$110 (-$15); FB is \$145 (+$20).

---

### 2.2 Serenique Resort Kandy (PDF Page 8)
- **Winter 2026/27 Table (Deluxe / Superior):**
  - Base: **Double HB = \$85**
  - **Occupancy Deltas (from Double HB):**
    - Single HB = \$75 &rarr; **-$10**
    - Triple HB = \$110 &rarr; **+\$25**
    - Quadruple HB = \$145 &rarr; **+\$60**
  - **Meal Plan Deltas (relative to HB):**
    - Double: BB is \$75 (-$10); FB is \$100 (+$15).
    - Single: BB is \$70 (-$5); FB is \$85 (+$10).
    - Triple: BB is \$90 (-$20); FB is \$135 (+$25).
    - Quadruple: BB is \$130 (-$15); FB is \$175 (+$30).

---

### 2.3 Rivendell Hotel (PDF Page 11)
- **Summer 2026 Table (All Markets):**
  - Base: **Double HB = \$45**
  - **Occupancy Deltas (from Double HB):**
    - Single HB = \$40 &rarr; **-$5**
    - Triple HB = \$60 &rarr; **+\$15**
    - Family HB = \$75 &rarr; **+\$30**
  - **Meal Plan Deltas (relative to HB):**
    - Perfect Uniformity: Across Single, Double, Triple, and Family, **BB is consistently -$5** and **FB is consistently +$15**.

---

### 2.4 Highland Stone House (PDF Page 21)
- **Winter 2026/27 Table:**
  - Base: **Double HB = \$120**
  - **Occupancy Deltas (from Double HB):**
    - Single HB = \$110 &rarr; **-$10**
    - Triple HB = \$160 &rarr; **+\$40**
    - Quad HB = \$200 &rarr; **+\$80**
  - **Meal Plan Deltas (relative to HB):**
    - Double: BB is \$110 (-$10); FB is \$140 (+$20).
    - Single: BB is \$100 (-$10); FB is \$120 (+$10).
    - Triple: BB is \$130 (-$30); FB is \$190 (+$30).
    - Quad: BB is \$160 (-$40); FB is \$240 (+$40).
  - Note: Meal steps scale directly with person count (\$10 per person meal difference).

---

### 2.5 Horton Heights Hotel (PDF Page 25)
- **Winter 2026/27 Table (Deluxe Rooms):**
  - Base: **Double HB = \$170**
  - **Occupancy Deltas (from Double HB):**
    - Single HB = \$160 &rarr; **-$10**
    - Triple HB = \$210 &rarr; **+\$40**
  - **Meal Plan Deltas (relative to HB):**
    - Double: BB is \$160 (-$10); FB is \$200 (+$30).
    - Single: BB is \$150 (-$10); FB is \$170 (+$10).
    - Triple: BB is \$180 (-$30); FB is \$250 (+$40).

---

### 2.6 Grand Beragala Boutique Resort (PDF Page 47)
- **Period 1 Table (01.07.2026 – 30.11.2026):**
  - Base: **Double HB = \$140**
  - **Occupancy Deltas (from Double HB):**
    - Single HB = \$130 &rarr; **-$10**
    - Triple HB = \$170 &rarr; **+\$30**
  - **Meal Plan Deltas (relative to HB):**
    - Double: BB is \$130 (-$10); FB is \$160 (+$20).
    - Single: BB is \$120 (-$10); FB is \$145 (+$15).
    - Triple: BB is \$150 (-$20); FB is \$200 (+$30).

---

### 2.7 The Thinnai Hotel (PDF Page 51 & 55)
- **Asian Market 2027/28 (p. 51):**
  - Base: **Double HB = \$115**
  - Single HB = \$100 (-$15); Triple HB = \$145 (+$30).
  - Single steps: BB is \$95 (-$5); FB is \$107 (+$7).
  - Double steps: BB is \$105 (-$10); FB is \$129 (+$14).
  - Triple steps: BB is \$115 (-$30); FB is \$166 (+$21).
  - Note: Food supplements are calculated on exact \$7 per person for lunch and \$10 per person for dinner.
- **European Market 2027/28 (p. 55):**
  - Base: **Double HB = \$127** (Base differs by market desk!)
  - Single HB = \$117 (-$10); Triple HB = \$157 (+$30).

---

## 3. Comparative Observations

1. **Are relationships fixed amounts or percentages?**
   - **Fixed dollar amounts**. No hotel in the 12-property collection uses percentage discounts (e.g. "15% off Double") in their contract sheets. All adjustments are flat whole-dollar increments.
2. **Do relationships change across seasons?**
   - **YES**. Mount Randholee adjusts Single HB by -$5 in Summer, but -$10 in Winter.
3. **Do relationships change across meal plans?**
   - **YES**. When moving from HB to FB, Triple rooms increase by double or triple the amount of Single rooms because three guests receive lunch.
4. **Is a universal formula viable?**
   - **NO**. Imposing a single hardcoded formula would violate 11 out of 12 partner contracts.

