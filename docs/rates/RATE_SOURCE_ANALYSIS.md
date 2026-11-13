# RATE SOURCE ANALYSIS — HOTEL RATE SHEETS & CONTRACT SPECIFICATIONS
**Window Companies Management System — Rate Foundation Analysis**  
**Source Document:** `All_Hotels_All_Markets_Rate_Sheets.pdf` (58 Pages, 12 Partner Hotels)  
**Analysis Date:** November 05, 2026  
**Auditor / Roles:** Senior Systems Analyst, Database Architect, Pricing & Revenue Engineer  

---

## 1. Document Inventory & Scope

The source collection represents 12 distinct Sri Lankan partner hotels across 15 original contract source filings compiled into `All_Hotels_All_Markets_Rate_Sheets.pdf`:

| Index | Hotel Name as in Source Document | PDF Pages | Quoted Markets | Applicable Periods / Years | Source Currency |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **01** | Mount Randholee Resorts & Spa | pp. 2–6 | All Markets | Summer 2026, Winter 2026/27, Summer 2027 | USD / LKR |
| **02** | Serenique Resort Kandy | pp. 7–9 | All Markets | Summer 2026, Winter 2026/27, Summer 2027 | USD |
| **03** | Rivendell Hotel | pp. 10–13 | All Markets | Summer 2026, Winter 2026/27, Summer 2027 | USD |
| **04** | Manarala Villa | pp. 14–19 | All Markets | Winter / Summer (2025/2026) | USD / LKR |
| **05** | Highland Stone House | pp. 20–23 | All Markets | Summer 2026, Winter 2026/27, Summer 2027 | USD |
| **06** | Horton Heights Hotel | pp. 24–26 | Unspecified / All | Winter 2026/27, Summer 2027 | USD |
| **07** | The Deer Park Hotel (Pvt) Ltd | pp. 27–31 | All Markets | Calendar Year 2026, Calendar Year 2027 | USD |
| **08** | The Agbo Hotel | pp. 32–35 | All Markets | Winter 2025/26, Summer 2026 | USD |
| **09** | Pearl Grand by Rathna | pp. 36–40 | All Markets | Summer 2026, Winter 2026/27 | USD |
| **10** | Rathna Beach Resort | pp. 41–45 | All Markets | Winter 2026/27 | USD |
| **11** | Grand Beragala Boutique Resort | pp. 46–49 | All Markets | July–Nov 2026, Dec 2026–Apr 2027, May–Nov 2027 | USD |
| **12** | The Thinnai Hotel | pp. 50–58 | Asian Market / European & Int'l | April 2027 to 2028 | USD |

---

## 2. In-Depth Comparative Dimensions Across All 12 Hotels

### 2.1 Hotel Names & Property Identifiers
- **Original Source Strings Preserved:**
  - `Mount Randholee Resorts & Spa` (Database hotel listed as `Randoli`)
  - `Serenique Resort Kandy`
  - `Rivendell Hotel`
  - `Manarala Villa`
  - `Highland Stone House` (Database hotel listed as `Highland Stone House` / `H.S.H`)
  - `Horton Heights Hotel` (Database hotel listed as `Horton Heights`)
  - `The Deer Park Hotel (Pvt) Ltd`
  - `The Agbo Hotel`
  - `Pearl Grand by Rathna` (City hotel in Colombo 03)
  - `Rathna Beach Resort` (Beach resort in Kalutara)
  - `Grand Beragala Boutique Resort` (Database hotel listed as `Beragala`)
  - `The Thinnai Hotel` (Jaffna)

### 2.2 Season Boundaries & Contract Validity Discrepancies
- The 12 hotels do **not** share uniform seasonal calendar boundaries:
  - **Standard Summer/Winter Split:**
    - Mount Randholee: Summer 1 (01.04.2026–31.10.2026), Winter (01.11.2026–31.03.2027), Summer 2 (01.04.2027–31.10.2027).
    - Serenique Resort Kandy: Winter (01.11.2026–30.04.2027), Summer (01.05.2026–31.10.2026 / 01.05.2027–31.10.2027).
    - Rivendell Hotel: Summer (01.03.2026–31.10.2026), Winter (01.11.2026–28.02.2027), Summer 2 (01.03.2027–31.10.2027).
  - **Full Calendar Year Contracts:**
    - The Deer Park Hotel: Calendar 2026 (01.01.2026–31.12.2026), Calendar 2027 (01.01.2027–31.12.2027).
  - **Asymmetric Period Splits:**
    - Grand Beragala: Period 1 (01.07.2026–30.11.2026), Period 2 (01.12.2026–30.04.2027), Period 3 (01.05.2027–30.11.2027).
    - Manarala Villa: Early Summer (01.08.2025–31.10.2025), Winter (01.11.2025–30.04.2026).
    - The Thinnai Hotel: Forward contract (01.04.2027 to 31.03.2028).

### 2.3 Market Segmentation
- **General Rule:** 11 of the 12 hotels issue contracts labeled **"ALL MARKETS"** or **"SPECIAL TRAVEL AGENT RATES"**.
- **Exception (The Thinnai Hotel, pp. 50–58):**
  - Features two distinct contract books with differing base rates:
    - **Contract Version 17BW:** *Asian Market* (p. 51).
    - **Contract Version 18BW:** *European & International Market* (p. 55).
  - Demonstrates that a single hotel property can maintain separate rate sheets partitioned by regional market desk.

### 2.4 Room Types & Occupancy Configurations
- **Mount Randholee (p. 3):** Superior Deluxe Rooms (25 rooms inventory). Single, Double, Triple.
- **Serenique Resort (p. 8):** Deluxe / Superior. Single (SGL), Double (DBL), Triple (TPL), Quadruple (QUAD).
- **Rivendell Hotel (p. 11):** Standard Room, Deluxe Room, Suite Room. SGL, DBL, TPL.
- **Manarala Villa (p. 15):** Entire Villa (Exclusive buyout), King Mountain View, King Forest View.
- **Highland Stone House (p. 21):** SGL, DBL, TPL, Quad.
- **Horton Heights (p. 25):** Deluxe Rooms, Premium Rooms (+US$ 50), Royal Suite (+US$ 150). SGL, DBL, TPL.
- **The Deer Park Hotel (p. 28):** Superior Cottage, Duplex Cottage, Angsana Cottage.
- **Pearl Grand by Rathna (p. 37):** Superior/Deluxe (Room Only, BB, HB), Suite (Room Only, BB, HB, FB; SGL, DBL, TPL, QUAD).
- **The Thinnai (p. 51):** 1-Bedroom Suite (Saaral / Marutham), 2-Bedroom Suite, Presidential Villa.

### 2.5 Meal Plans
- **Meal Basis Codes:**
  - **RO:** Room Only
  - **BB:** Bed & Breakfast
  - **HB:** Half Board (Breakfast + Dinner)
  - **FB:** Full Board (Breakfast + Lunch + Dinner)
- Note: Some contracts (e.g. Manarala Villa, Horton Heights) provide base pricing starting from BB or HB, whereas others (Pearl Grand) quote starting from RO.

---

## 3. Supplement, Deduction, and Policy Matrix

| Hotel | Room Only Reduction | BB Deduction | Extra Bed Supplement | Triple Supplement | Peak / Festive Supplement | Taxes / VAT Treatment |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Mount Randholee** (p. 4) | $15 PR from BB | Not formulated | $10 PR (Bed only) | Matrix based ($10-$15 over DBL) | August ($10 PR), Perahera ($15 PP), Super Peak Dec 20–Jan 10 ($10 PR), Xmas/NYE Gala Dinner ($40 BB / $25 HB) | Net, Non-commissionable. Inclusive of VAT & SC. |
| **Serenique Resort** (p. 8) | $15 PR from HB | Not formulated | $10 PR (Bed only) | Explicit in table | Dec 20–Jan 10 ($10 PR), Perahera ($20 PP), Xmas/NYE Gala ($40 BB / $25 HB) | Net rates. Subject to Gov tax changes. |
| **Rivendell Hotel** (p. 12) | Not specified | Matrix based | $10 PR (BB basis) | Explicit in table | July & Aug ($10 PR), Dec 20–Jan 10 ($10 PR), Perahera ($20 PP), Xmas/NYE Gala ($40 BB / $25 HB) | Inclusive of Service Charge & VAT. |
| **Highland Stone House** (p. 21) | Not specified | Matrix based | Matrix based | Explicit in table | Dec 20–Jan 10 ($20 PR), April 10–20 ($20 PR), July 1–Aug 31 ($15 PR) | **EXCLUSIVE** of Service Charge, VAT, TDL & SSCL. |
| **Grand Beragala** (p. 47) | Not specified | Matrix based | Matrix based | Explicit in table | Dec 20–Jan 10 ($20 PR), Panorama Suite ($15 PR), Family Suite ($30 PR) | **EXCLUSIVE** of Service Charge, VAT, TDL & SSCL. |
| **The Deer Park** (p. 29) | Not specified | Matrix based | $15 PR (Bed only) | Explicit in table | Dec 24 / 31 Compulsory Gala ($50 PP BB / $40 PP HB / $30 PP FB) | Quoted net per room per night. |
| **The Agbo Hotel** (p. 33) | Not specified | Matrix based | Matrix based | Explicit in table | Perahera / Peak period dates | Inclusive of all applicable taxes. |
| **The Thinnai** (p. 52) | Not specified | Matrix based | $20 PR | Explicit in table | Dec 20–Jan 10 ($20 PR), High Peak ($30 PR), Xmas Gala ($45 PP), NYE Gala ($55 PP) | Rates net and non-commissionable. |

---

## 4. Key Operational Insights for CRM Architecture

1. **Unit of Measure Divergence (Per Room vs. Per Person):**
   - Room rates, Room Only deductions, and Room Supplements are universally quoted **Per Room Per Night (PRPN)**.
   - Gala Dinners (Christmas Eve, New Year's Eve) and Perahera festival tickets are quoted **Per Person (PP)**.
   - Mixing PR and PP without clear labels leads to quoting errors.
2. **Tax Inclusivity Divergence:**
   - Mount Randholee, Rivendell, and Agbo rates are **inclusive** of VAT and Service Charge.
   - Highland Stone House and Grand Beragala rates are explicitly **exclusive** of VAT, TDL, SSCL, and Service Charge.
   - Quote summaries and PDF exports must clearly print the specific tax applicability statement.
3. **Driver & Guide Accommodations:**
   - Standard across nearly all 12 hotels: Guide room ~$30–$40 per night (HB/BB); Bus drivers (1–2 pax) accommodated Free of Charge (FOC) with driver meals included.

