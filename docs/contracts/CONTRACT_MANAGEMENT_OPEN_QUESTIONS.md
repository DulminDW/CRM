# Contract Management Open Questions & Business Clarifications
**Window Companies (Pvt) Ltd. — CRM Project**

---

During the Phase 8 implementation of the Hotel Contract Management module, configurable defaults were established following the project rule: *"never invent unresolved company business rules or silently assume missing information. Where a business rule is not confirmed, implement a safe configurable structure and clearly document the unresolved decision."*

The following points should be reviewed with Window Companies management:

---

### Question 1: Contract Overlap for the Same Property & Season
- **Current Implementation**: The system allows multiple active contracts for the same hotel if their validity dates or targeted market scopes differ, but raises a gentle informational notice.
- **Clarification Needed**: Should the system strictly enforce uniqueness (only ONE active contract per hotel per date window), or can a hotel have parallel contracts (e.g., standard FIT vs. Series/Group contract)?
- **Configurable Fallback in Place**: Flexible multi-contract filtering with status flag check.

---

### Question 2: Automatic Expiry Transition
- **Current Implementation**: The UI and service dynamically mark contracts as "Expired" if `valid_to < today`, regardless of whether the database status column has been explicitly updated from `ACTIVE` to `EXPIRED`.
- **Clarification Needed**: Would management prefer a nightly scheduled database job (or edge function) to formally update the `status` column to `EXPIRED`, or is client-side date-window comparison sufficient?
- **Configurable Fallback in Place**: Dynamic date-validity check `isContractExpired()` in combination with status attribute.

---

### Question 3: Contract Document Storage Bucket Policy
- **Current Implementation**: Migration `000013` declares metadata table `hotel_contract_documents` and integrates with private storage bucket `hotel-contracts`.
- **Clarification Needed**: What is the maximum allowed file upload size per contract PDF (e.g. 10MB vs 25MB), and should document downloads generate signed URLs with a 15-minute expiry?
- **Configurable Fallback in Place**: Private bucket architecture with metadata tracking.

---

### Question 4: Multi-Currency Contracts vs Rate Sheet Currency
- **Current Implementation**: Contracts support custom currency (USD, EUR, GBP, LKR). When generating quotes, the quote item adopts the currency specified by the rate sheet or custom template, falling back to the contract currency if unspecified.
- **Clarification Needed**: If a hotel contract is denominated in EUR but the agency quote is requested in USD, should currency conversion be handled automatically via an exchange rate table, or should quotes always adhere to the contract/rate currency?
- **Configurable Fallback in Place**: Explicit currency inheritance from the chosen rate sheet or contract.

