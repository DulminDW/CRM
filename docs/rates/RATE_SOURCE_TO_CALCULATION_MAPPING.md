# RATE SOURCE TO CALCULATION MAPPING
**Window Companies Management System — Source Document Mapping**  
**Document Code:** `RATE_SOURCE_TO_CALCULATION_MAPPING.md`  
**Date:** November 05, 2026  

---

## 1. Matrix Mapping Table

| Hotel Name | PDF Page | Typical SGL Deduction | Typical TPL Supplement | Typical BB Deduction | Typical FB Supplement | Recommended Setup Configuration |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Mount Randholee Resorts & Spa** | pp. 2–6 | -$5 (Sum) / -$10 (Win) | +$25 | -$5 (Sum) / -$10 (Win) | +$15 | Dynamic adjustment based on season toggle |
| **Serenique Resort Kandy** | pp. 7–9 | -$10 | +$25 | -$10 | +$15 | Fixed Room Basis adjustments |
| **Rivendell Hotel Gurudeniya** | pp. 10–13 | -$5 | +$15 | -$10 | +$10 | Conservative delta configuration |
| **Manarala Villa** | pp. 14–19 | -$10 | +$30 | -$10 | +$20 | Per-room luxury villa adjustments |
| **Highland Stone House** | pp. 20–23 | -$10 | +$40 | -$10 | +$20 | Premium hill country scaling |
| **Horton Heights Hotel** | pp. 24–26 | -$10 | +$40 | -$10 | +$10 (Sum) / +$30 (Win) | High seasonal variance |
| **The Deer Park Hotel** | pp. 27–31 | -$10 | +$45 to +$55 | -$10 | +$20 to +$30 | Per-person scaled meal plans |
| **The Agbo Hotel** | pp. 32–35 | -$10 | +$20 | -$10 | +$10 | Heritage circuit standard delta |
| **Pearl Grand by Rathna** | pp. 36–40 | -$10 | +$25 | -$10 | +$15 | Colombo city baseline |
| **Rathna Beach Resort** | pp. 41–45 | -$10 | +$25 | -$10 | +$15 | Coastal resort standard delta |
| **Grand Beragala Boutique Resort** | pp. 46–49 | -$10 | +$30 | -$10 | +$20 | Boutique mountain retreat scaling |
| **The Thinnai Hotel** | pp. 50–58 | -$15 | +$30 | -$15 | +$25 | Multi-market differential |

All rules mapped directly to configurable fields in [`RateCalculatorPage.tsx`](file:///c:/Users/Nethshan%20Dulmin/Desktop/CRM/src/pages/RateCalculatorPage.tsx).

