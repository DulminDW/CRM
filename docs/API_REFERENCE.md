# WINDOW COMPANIES CRM – SERVICE API REFERENCE

All business logic and Supabase database interactions in WINDOW COMPANIES CRM are encapsulated inside modular, typed TypeScript services located under `src/services/`.

---

## 1. Employee Management API (`employeeService.ts`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `getEmployees()` | None | `Promise<Employee[]>` | Fetches all internal company staff profiles from `user_profiles`. |
| `updateEmployeeRole(id, role)` | `id: string, role: 'ADMIN' \| 'STAFF'` | `Promise<void>` | Promotes or demotes an internal employee's administrative role. |
| `updateRatePermission(id, canManage)` | `id: string, canManage: boolean` | `Promise<void>` | Grants or revokes permission to view, edit, and share contracted rates. |
| `toggleEmployeeActive(id, isActive)` | `id: string, isActive: boolean` | `Promise<void>` | Activates or deactivates an employee account. |
| `inviteEmployee(data)` | `{ email, fullName, role, canManageRates }` | `Promise<Employee>` | Initiates onboarding flow and provisions provisional profile. |
| `resetEmployeePassword(email)` | `email: string` | `Promise<void>` | Dispatches an official Supabase Auth password reset link. |

---

## 2. Daily Task Assignment API (`taskService.ts`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `getTasks(filter?)` | `filter?: { assigneeId?, status?, priority? }` | `Promise<Task[]>` | Queries tasks joined with assignee & assigner profile metadata. |
| `createTask(payload)` | `CreateTaskPayload` | `Promise<Task>` | Creates a task and records the initial creation activity. |
| `updateTaskStatus(id, status, blocker?)` | `id: string, status: TaskStatus, blocker?: string` | `Promise<void>` | Transitions task state (`TODO` -> `IN_PROGRESS` -> `BLOCKED` / `DONE`). |
| `addTaskComment(taskId, comment)` | `taskId: string, comment: string` | `Promise<TaskComment>` | Adds discussion note to an active task. |
| `getTaskActivities(taskId)` | `taskId: string` | `Promise<TaskActivity[]>` | Retrieves chronological audit trail of state changes and blocker flags. |

---

## 3. Hotel & Contract Management API (`hotelService.ts`, `contractService.ts`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `getHotels()` | None | `Promise<Hotel[]>` | Fetches all registered hotels with active status. |
| `getHotelById(id)` | `id: string` | `Promise<Hotel>` | Retrieves hotel details, rooms, meal plans, and contacts. |
| `getHotelContracts(hotelId)` | `hotelId: string` | `Promise<HotelContract[]>` | Retrieves executed contracts and associated document vaults. |
| `uploadContractDocument(file, meta)` | `file: File, meta: ContractDocMeta` | `Promise<string>` | Uploads PDF/DOCX to Supabase `contract-documents` bucket and links metadata. |
| `getHotelSeasons(hotelId)` | `hotelId: string` | `Promise<HotelSeason[]>` | Queries date ranges for peak, shoulder, low, or blackout seasons. |

---

## 4. Rate Engine & Quotation API (`quoteService.ts`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `calculateRates(params)` | `RateCalculationParams` | `CalculatedRateResult` | Evaluates Base Rate, Season Multipliers, Meal Supplements, Tax, and Markup. |
| `createQuote(quoteData)` | `CreateQuoteInput` | `Promise<QuoteRecord>` | Persists generated quote record in `quotes` table with snapshot JSON. |
| `getQuoteHistory(filters?)` | `filters?: QuoteHistoryFilter` | `Promise<QuoteRecord[]>` | Queries dispatched quotes with recipient and agency associations. |
| `dispatchRateShare(quoteId, dispatchMeta)` | `quoteId: string, dispatchMeta: any` | `Promise<void>` | Records email handoff/dispatch attempt, logs recipient list, and updates status. |

---

## 5. Travel Agency & Contact Hierarchy API (`agencyService.ts`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `getAgencies(filter?)` | `filter?: AgencyFilter` | `Promise<Agency[]>` | Lists travel agency companies with market tagging. |
| `getAgencyMarkets()` | None | `Promise<Market[]>` | Retrieves geographic and commercial market segments (e.g., UK, DACH, GCC). |
| `getAgencyMembers(agencyId)` | `agencyId: string` | `Promise<AgencyMember[]>` | Retrieves contact persons associated with a travel agency. |
| `createAgency(agencyData)` | `CreateAgencyInput` | `Promise<Agency>` | Registers a new travel agency partner. |

---

## 6. Excel Bulk Import API (`bulkImportService.ts`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `parseExcelFile(file)` | `file: File` | `Promise<ParsedWorkbook>` | Reads sheets and converts raw tabular rows into JSON. |
| `validateImportData(category, rows)` | `category: ImportCategory, rows: any[]` | `ValidationResult` | Runs strict schema, uniqueness, and relational integrity validations. |
| `executeBulkImport(category, rows)` | `category: ImportCategory, rows: any[]` | `Promise<ImportSummary>` | Batches and commits sanitized records via Supabase PostgREST transactions. |
| `logImportHistory(summary)` | `summary: ImportSummary` | `Promise<void>` | Records audit record into `bulk_import_history` table. |

