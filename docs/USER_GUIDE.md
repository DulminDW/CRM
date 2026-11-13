# WINDOW COMPANIES CRM – USER OPERATIONAL MANUAL

Welcome to the **WINDOW COMPANIES MANAGEMENT SYSTEM** user guide. This document provides step-by-step instructions for internal company employees.

---

## 1. System Navigation

The application navigation is organized into functional sections located in the left sidebar:

- **Dashboard:** Operational KPI summary, recent quotes, pending tasks, and recent activity.
- **Operations & Relationships:**
  - `Travel Agencies`: Agency partners, business registration details, and credit terms.
  - `Agency Members`: Direct contact persons, agents, and email directories.
  - `Markets`: Commercial and geographical operating sectors (DACH, UK, CIS, Middle East, etc.).
- **Inventory & Contracts:**
  - `Hotels & Properties`: Partner hotels, room types, meal plans, and facilities.
  - `Hotel Seasons`: Seasonal validity calendars (Peak, Low, Shoulder).
  - `Contracts`: Signed agreements, commercial terms, and uploaded document vaults.
- **Rate Engine & Quotations:**
  - `Rate Management`: Contracted base rates, supplement pricing, and tier definitions.
  - `Rate Calculator`: Dynamic quote generator with tax, meal supplement, and markup calculation.
  - `Share Rates`: Contract rate packaging and email preview dispatch wizard.
  - `Rate History`: Log of past dispatched quotations.
- **Management & Administration:**
  - `Daily Tasks`: Internal task assignments, status tracking, blocker notifications.
  - `Bulk Import`: Excel template download and batch data onboarding.
  - `Staff Directory` *(Admins only)*: Employee user management and role controls.
  - `Team Chat`: Departmental chat channels and direct messages.

---

## 2. Managing Travel Agencies & Contacts

### Adding a Travel Agency
1. Navigate to **Travel Agencies** from the sidebar.
2. Click **Add Agency**.
3. Fill in the Agency Name, Code, Primary Market, Credit Limit, and Billing Address.
4. Click **Save Agency**.

### Adding Agency Members
1. Under **Agency Members**, click **Add Contact Member**.
2. Select the parent **Travel Agency** from the dropdown.
3. Enter the contact's Full Name, Job Title, Email Address, and Phone Number.
4. Specify if this member is the **Primary Billing Contact** or **Reservations Lead**.
5. Click **Save Member**.

---

## 3. Rate Sharing & Email Preview Workflow

To share rates with an agency or travel partner:

1. Navigate to **Share Rates** (`/rates/share`).
2. **Step 1: Select Property & Season:**
   - Choose the target Hotel from the dropdown.
   - Choose the active Contract and Hotel Season.
3. **Step 2: Choose Recipient Scope:**
   - *Entire Company:* Emails all registered contacts under the selected travel agency.
   - *Market Selection:* Emails all contacts assigned to a specific market within that agency.
   - *Individual Member:* Targets a single specific agent contact.
   - *Manual Selection:* Pick multiple contacts using the interactive checkboxes.
4. **Step 3: Select Rate Category:**
   - Select **GREEN** (Standard Tier), **RED** (Budget Tier), **YELLOW** (Premium Tier), or **CUSTOM**.
   - If *CUSTOM* is selected, enter the approved custom rate per night and business justification.
5. **Step 4: Real-time Email Preview:**
   - Review the generated email preview on the right-hand panel.
   - Verify the hotel name, valid season dates, room types, pricing table, inclusions, and contact signature.
6. **Step 5: Dispatch to Email Client:**
   - Click **Send via Default Email App (mailto:)** or **Continue in Gmail**.
   - Your local email client will open with the exact subject, recipients, and pre-formatted body.
   - Return to the CRM and click **Confirm Email Dispatched** to log the quotation in the audit history.

---

## 4. Excel Bulk Import Wizard

To import large batches of hotels, seasons, agencies, or members:

1. Navigate to **Bulk Import** (`/bulk-import`).
2. Select your data category (e.g., *Travel Agencies*).
3. Click **Download Excel Template (.xlsx)**.
4. Open the template in Microsoft Excel or Google Sheets and populate your records according to the sample headers.
5. Drag and drop the completed file into the upload dropzone.
6. The system will automatically validate the file for formatting, duplicate keys, and missing fields.
7. If errors are detected, click **Download Error Report** to review rows requiring correction.
8. If the validation passes (`All rows valid`), click **Confirm & Import Records**.

---

## 5. Daily Task Assignment (`/tasks`)

Internal staff can coordinate daily assignments:

- **Viewing Tasks:** Filter tasks by *Assigned to Me*, *Created by Me*, *Priority*, or *Status*.
- **Updating Progress:** Drag or update task status between `TODO`, `IN_PROGRESS`, and `DONE`.
- **Flagging Blockers:** If an assignment cannot proceed (e.g., waiting for hotel confirmation), select `Flag as Blocked` and enter the blocking reason. This highlights the task in red for team visibility.
- **Comments & Timeline:** Open any task to post updates or view the chronological activity log.

