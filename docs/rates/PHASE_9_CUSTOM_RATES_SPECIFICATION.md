# Phase 9: Custom Rates vs. Special Rates Specification
**Window Companies (Pvt) Ltd. — CRM Project**  
**Date:** November 11–12, 2026 (Phase 9)  

---

## 1. Domain Separation of Concepts

To prevent accidental data model conflation, four distinct pricing concepts are enforced across database tables and user interfaces:

| Concept | Purpose | Schema Entity | UI Location |
|---|---|---|---|
| **A. Red / Green / Yellow** | Standard seasonal pricing tiers (Lowest, Normal, Highest). | `hotel_rate_outputs` / `hotel_rate_configs` | Rate Calculator & Share Rates |
| **B. Custom 1 / 2 / 3** | Reusable commercial rate options (e.g. negotiated rates with 1,500 room-night commitments). | `custom_rate_templates` | Rate Management Hub (`TEMPLATES`) |
| **C. Reusable Calculation Setups** | Optional user-created formulas storing 2-axis delta rules. Unlimited in number. | `rate_calculation_setups` | Rate Calculator (`Reusable Setups`) |
| **D. Special Rates 1 / 2 / 3** | Agency-specific negotiated VIP rate slots. | `agency_special_rates` | Special Rates Page (`/special-rates`) |

---

## 2. Plus (+) Custom Rate Creation Workflow

1. Navigate to **Rate Management Hub** &rarr; **Custom Templates**.
2. Click **+ Create Custom Template**.
3. Select slot: `Custom 1`, `Custom 2`, or `Custom 3`.
4. Enter `Template Name` (e.g. "European Summer FIT Volume Deal").
5. Specify `Rate Amount` and `Currency` (USD, EUR, GBP, LKR).
6. Optionally configure `Room Night Condition` (e.g. 1500 minimum room nights).
7. Save. The custom rate template is immediately available for selection in the Share Rates wizard.

