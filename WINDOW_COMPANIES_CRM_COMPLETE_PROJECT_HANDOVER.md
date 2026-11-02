# WINDOW COMPANIES CRM

## Complete Project Handover, Requirements & New-Chat Memory

**Project status date:** 02 November 2026\
**Purpose:** Preserve the full project context so work can continue in a
new ChatGPT chat if this conversation is deleted.

> **New-chat instruction:** Read this entire document before responding.
> Treat confirmed decisions as the current source of truth. Keep
> unconfirmed items open; do not invent business rules. The user is a
> solo intern developer and needs beginner-friendly, step-by-step
> guidance in simple English or Sinhala/Singlish.

------------------------------------------------------------------------

# 1. How to continue in a new chat

Upload this file and use this prompt:

> I am continuing my WINDOW COMPANIES CRM project. Read the entire
> `WINDOW_COMPANIES_CRM_COMPLETE_PROJECT_HANDOVER.md`. It contains the
> requirements, company decisions, UI design direction, technical
> architecture, workflows, database planning, open questions and
> roadmap. Treat confirmed decisions as final unless I explicitly update
> them. Do not invent missing rules. I am a solo intern developer, so
> guide me step by step. First summarize the project status and the next
> practical task. When writing code, give exact file paths, complete
> code, commands, and testing steps.

Assistant working rules: - This file is the master project memory. -
Preserve the company's terminology: Travel Agency, Market, Member,
Hotel, Season, Rate, Special Rate, Sales Team, Sales Activity. - Later
confirmed answers override earlier unconfirmed assumptions. - Do not
revert to the older simplified Property/DMC-only model. - Agency members
are CRM contact profiles, not external login users. - Never expose
internal rate labels, cost prices or margins in external emails unless
approved. - Do not claim a feature is complete until implemented and
tested. - Build in small phases suitable for one intern developer. -
Inspect supplied Excel files before designing imports or formulas. -
Never put passwords, API keys, Supabase service-role keys or private
credentials in this document. - When updating this handover, preserve
earlier progress and add only verified work, decisions, test results and
next tasks.

# 2. Project overview

  -----------------------------------------------------------------------
  Item                                Details
  ----------------------------------- -----------------------------------
  Project                             WINDOW COMPANIES CRM

  Type                                Internal CRM for a sales/marketing
                                      company

  Business                            Shares partner hotel rates with
                                      travel agencies / DMC contacts

  Developer                           User is an intern and sole
                                      developer

  Internal users                      Approximately 5--15 staff

  Existing CRM/database               None

  Initial development                 User's personal laptop

  Shared database                     Supabase selected

  Desired frontend hosting            Vercel

  Roles                               Admin and Staff

  Agency-member login                 Not required; contact profiles only

  Main goal                           Manage agencies, markets, contacts,
                                      hotels, seasons, rates, quotes,
                                      emails, sales activities, internal
                                      chat/notifications and analytics
  -----------------------------------------------------------------------

## 2.1 Core business workflow

Sales staff maintain partner hotel information and rates. A salesperson
should be able to find or create an agency contact, review previous
quotes, select one or more hotels, choose the correct season and rate
option for each hotel, preview the recipients and quote, send the rates
by email, save an exact quote snapshot, notify the internal Sales Team
group, and record the sales activity.

The CRM also needs hotel-specific rate calculations,
agency/market/member hierarchy, internal staff chat, reports and
analytics.

# 3. Sources and requirement history

The project has been informed by: 1. Original company PDF: **WINDOW
COMPANIES CRM.pdf** (8-page plan). 2. Company conversation/transcript
uploaded by the user. 3. Whiteboard photograph showing the intended CRM
structure and rate screen. 4. User's written answers to 12 clarification
questions. 5. Earlier project planning and UI discussions.

When older general wording differs from a later explicit company answer,
use the later confirmed answer. Preserve original PDF requirements
unless the company explicitly replaces them.

# 4. Original company PDF requirements

The PDF was titled **WINDOW COMPANIES CRM -- PLAN** and listed five core
modules: 1. Property (Hotel) Management. 2. DMC Management. 3. Rate
Sheet Management. 4. Communication (Send Rates to DMCs). 5. Reports &
Analytics.

## 4.1 Property / Hotel Management (original PDF)

Requirements: - Add, edit and delete properties. - Assign service type:
Online / Offline / Both. - Link multiple DMCs to a property. - Filter by
Area, Service Type and Property Type.

Initial suggested fields: `property_id`, `property_name`,
`property_type`, `area`, `contact_number`, `email`, `service_type`,
`created_at`.

The later company conversation uses **Hotel** and introduces seasons,
agency contacts and hotel rate workflows. Use "Hotels" in the UI if
appropriate, but confirm whether Property and Hotel are exactly
equivalent for every record.

## 4.2 DMC Management (original PDF)

Requirements: - Add DMCs. - Assign DMCs to properties. - Maintain
contact details.

Initial suggested fields: `dmc_id`, `dmc_name`, `contact_person`,
`email`, `phone`.

## 4.3 Property--DMC relationship

The PDF proposed a join table `property_dmc` with `id`, `property_id`,
`dmc_id`, allowing many-to-many relationships.

## 4.4 Rate Sheet Management (original PDF)

Requirements: - Winter rates. - Summer rates. - Special rates
(originally described as custom per DMC). - Multiple rate sheets per
hotel/property. - Upload rates from Excel OR enter manually. - Version
control (explicitly important).

Initial proposed `rate_sheets` fields: `ratesheet_id`, `property_id`,
`season`, `title`, `valid_from`, `valid_to`, `created_at`, `status`.

Initial `rate_details` fields: `rate_id`, `ratesheet_id`, `room_type`,
`meal_plan`, `price`, `extra_bed_price`, `child_policy`.

Initial `special_rates` fields: `special_rate_id`, `ratesheet_id`,
`dmc_id`, `discount_percentage`, `special_price`, `valid_from`,
`valid_to`.

**Later update:** company clarified Special Rate 1, 2 and 3 are
agency-specific. Do not blindly implement the old generic DMC-discount
idea.

## 4.5 Communication (original PDF)

Requirements: - Select property. - Select rate sheet. - Select one or
more DMCs. - Email rate sheets as PDF and/or Excel. - Track sending
history.

Initial `email_logs` concept: `email_id`, `ratesheet_id`, `dmc_id`,
`sent_date`, `status`.

The later agency-contact quote workflow says all rate information should
be in the email body. This does not automatically cancel the original
DMC PDF/Excel workflow. Keep them separate until the company confirms
otherwise.

## 4.6 Reports & Analytics (original PDF)

Requirements: - Download rate sheets as PDF/Excel. - Property list
report. - Filter by area and service type. - DMC-wise rate
distribution. - Active vs expired rate sheets.

Later requirements add hotel-wise, agency-wise, market-wise and
staff-wise analysis, an Analytics tab and PDF export.

## 4.7 Additional PDF recommendations

-   Admin / Staff roles.
-   Contract/document uploads.
-   Rate expiry alerts.
-   Property performance tracking.
-   Mobile-friendly UI.

Admin/Staff and mobile responsiveness are confirmed. The exact scope of
contract uploads and property performance tracking remains to be
confirmed.

# 5. Travel Agency → Market → Member hierarchy

This hierarchy is clarified by the company conversation and whiteboard.

Example: - Travel Agency: Jetwing Travels - Indian Market: Sarith,
Surith - Europe Market: Jana - Belgium Market: Priya

## 5.1 Travel Agency

Required agency list and details. Expected actions: - Search agency. -
Add agency. - View/edit agency. - View its markets. - View all members
under it.

Do not invent mandatory agency fields beyond company-provided data.

## 5.2 Markets

Each market belongs to one agency. Examples: Indian, Europe, Belgium.

UI: - Select agency from dropdown. - View that agency's markets. - Add
market. - Open market members.

Do not assume a market name is globally unique; it may repeat under
different agencies.

## 5.3 Members / contact profiles

Company conversation fields: - Name. - Email. - Phone. - Position/title
(e.g. Manager, Executive). - Member code/identifier (format to
confirm). - Linked Travel Agency. - Linked Market.

Confirmed: - No external CRM login for agency members. - These are
internal CRM contact profiles. - Search by name/email. - View
rates/quotes previously sent to a contact. - After creating/opening a
contact, staff can continue to Share Rates.

Duplicate handling: - Conversation says existing email or name should
prevent duplicate member creation. - At minimum, detect duplicate
email. - Name-only blocking needs confirmation because different people
can share a name. - Approximately 1,000 existing contacts will be
provided in Excel for import.

## 5.4 Contact import

The user said company Excel sheets will be supplied and can be
extracted/imported.

Import process: 1. Inspect every workbook and sheet. 2. Read actual
column headings, sample rows, formulas and formats. 3. Map agency,
market, member, hotel, season and rates. 4. Identify missing links and
inconsistent names. 5. Detect duplicate emails and possible duplicate
names. 6. Validate data without destroying source values. 7. Show import
preview and validation errors. 8. Allow corrections or produce an error
report. 9. Import only after confirmation. 10. Record source file/import
batch and counts. 11. Never silently overwrite existing data.

Do not invent the Excel structure before seeing the files.

# 6. Hotel and season management

Company examples of hotels: - Randoli. - Beragala. - Horton Heights /
H.H. (confirm official spelling). - H.S.H. (whiteboard abbreviation;
confirm full name).

Hotel UI: - Search. - Add/edit hotel. - View details. - View
seasons/years. - Open rate configuration.

Do not invent addresses, star ratings, room types or contact data.

Example season labels on whiteboard: - 2026 Summer. - 2026/27 Winter. -
2027 Summer.

Each hotel can have its own season/year rate structures. Date In and
Date Out are relevant to season/special rate records where specified.
Exact season definitions and overlapping-date rules need confirmation.

# 7. Rate management --- confirmed rules

## 7.1 Rate colour mapping (CONFIRMED)

  Colour   Meaning
  -------- --------------
  Red      Lowest Rate
  Green    Normal Rate
  Yellow   Highest Rate

Always show text labels as well as colours for accessibility.

## 7.2 Rate dimensions

Rates vary by hotel and season/year, and agency-specific negotiated
rates may also apply. Exact pricing scope and real values must come from
company Excel files and confirmed rules. Never hard-code illustrative
values.

## 7.3 User-friendly rate selection

Recommended workflow: 1. Select Hotel dropdown. 2. Select Season/Year
dropdown. 3. Select relevant rate type/details. 4. Show Red / Green /
Yellow rate cards or simple rows. 5. Clearly show amount and currency.
6. Select the intended rate. 7. Save or continue to quote/share.

Do not show every hotel, season and rate field in one huge crowded
table.

## 7.4 Hotel-specific automatic calculation (CONFIRMED)

User confirmed calculation rules are configured separately for each
hotel.

Whiteboard/conversation references: - HB Double Rate as a base rate. -
Single Reduction. - Triple Supplement. - BB Reduction. - Calculate
related rate outputs automatically from the configured base and
supplements/reductions.

Whiteboard values (e.g. base around 70, supplement around 20/30,
reductions around 5) are examples only and are not confirmed real
company rates or formulas.

Before implementing the calculation engine, obtain the actual Excel rate
sheets and confirm: - Exact formulas for Single, Double, Triple, BB and
HB. - Currency. - Whether amount is per room/night/person. - Rounding
and tax rules. - Meal/occupancy rules.

## 7.5 Special Rates 1, 2, 3 (CONFIRMED)

-   Exactly three special rate types/slots: Special Rate 1, 2 and 3.
-   They are **agency-specific**, not a general hotel-season rate shared
    with all agencies.
-   Special rate negotiation may happen during a sales conversation.
-   Record amount, Date In, Date Out, note/reason, creator and
    timestamp.
-   Admin approval is **not required** to create special rates.

Confirm whether each special rate is linked to agency + hotel + season,
and whether one agency can have different special rates for different
hotels/seasons. Current confirmed scope is agency-specific, not
member-specific.

## 7.6 Rate visibility and editing permissions

Confirmed: - A rate given by one staff member is visible to other
company staff members, subject to permissions. - Admin and specifically
authorized Staff can edit protected rate data. - Admin can grant
rate-management access to selected Staff. - Ordinary Staff without that
permission cannot create/edit protected rate configuration. - Enforce
this in Supabase RLS and server-side functions, not only by hiding
frontend controls. - Log important rate changes with actor, timestamp
and old/new values where practical.

## 7.7 Monthly rate updates and expiry

User said they want rates saved and editable inside CRM, e.g. updated
about once per month. They do not need additional expiry alerts
specifically for the newly discussed Date In/Date Out workflow.

However, the original PDF lists rate-expiry alerts. Do not silently
remove that original requirement. Confirm whether it remains active,
what records it applies to, lead times and recipients. Do not invent
monthly reminder notifications.

# 8. Rate distribution / Share Rates

## 8.1 Recipient scopes (CONFIRMED)

All three are final: 1. **Individual Member** --- one selected contact.
2. **Entire Market** --- all relevant members in the selected market. 3.
**Entire Agency** --- all members across all markets in that agency.

Example: Jetwing Travels → Indian Market → send to all members under
Indian Market.

## 8.2 Hotel selection

The workflow supports: - All partner hotels. - One specific hotel. -
Multiple selected hotels.

Each selected hotel may have its own selected rate option, subject to
confirmed business rules.

## 8.3 Recommended sending wizard

**Step 1 --- Recipient scope:** Individual / Entire Market / Entire
Agency.

**Step 2 --- Recipients:** Agency dropdown; Market dropdown where
needed; Member search/dropdown for Individual. Show recipient count.

**Step 3 --- Hotels:** All Hotels / One Hotel / Multiple Hotels.

**Step 4 --- Season:** Select relevant season/year.

**Step 5 --- Rates:** Select Red / Green / Yellow / Custom as
applicable, per hotel.

**Step 6 --- Review:** Show recipients, email addresses, hotels,
seasons, final prices, currency and confirmed conditions.

**Step 7 --- Send:** Send email, save quote snapshot and send attempt,
notify fixed Sales Team group, show clear result.

Use dropdowns, conditional fields and Back/Next controls. Do not show
every option simultaneously.

## 8.4 Email body (CONFIRMED for new agency quote workflow)

The user said all rate details should be inside the email body.

-   New agency-contact quote workflow: rate information in email body.
-   Do not assume PDF/Excel attachment is required for this new
    workflow.
-   Use company-approved email wording and branding.
-   Show external recipient only final approved rate details.
-   Do not expose internal rate colour labels, cost prices or margins by
    default.

The original DMC workflow's PDF/Excel requirement remains separate until
clarified.

## 8.5 Confidential/VIP rate protection

A special or individual rate must not accidentally go to another
agency/contact.

Before sending: - Validate agency/contact/rate relationship
server-side. - Validate hotel/season/rate selection. - Ensure recipient
scope is allowed for the selected special rate. - Preview recipient list
and count. - Save exact quote snapshot and actual recipients. - Do not
rely on frontend filtering alone.

# 9. Four quote options

The standard mapping remains: - Red = Lowest. - Green = Normal. - Yellow
= Highest.

A fourth quote choice is: - **Custom** = salesperson enters a price,
subject to approved permissions/validation.

Earlier example amounts (Yellow USD 60, Green USD 55, Red USD 50) are
illustrative only and must not be hard-coded.

Custom UI: - Reveal editable price input. - Validate amount and
currency. - Apply minimum/maximum/margin rules only after company
confirms them. - Record who entered it. - Save exact quote snapshot. -
Do not expose internal labels or pricing strategy in the external email
by default.

# 10. Contact profile and quote history

Required core contact fields confirmed: name, email and travel agency
name. Other fields (phone, market, position, member code) come from the
company contact structure where available.

Contact detail should show: - Name/email/agency. - Market and other
available contact details. - Previous quotes/rate shares. - Hotel(s)
quoted. - Final rate amounts and relevant rate details. - Staff member
who shared. - Date/time. - Email status. - Share Rates action.

Historical quotes must not change if current hotel rates are later
edited. Save an immutable quote snapshot.

# 11. Sales Team notifications

## 11.1 Fixed Sales Team group (CONFIRMED)

-   Rate-sharing notifications go to one fixed internal Sales Team
    group.
-   Sender does not choose a destination group each time.
-   Group members should receive notifications individually/in-app as
    appropriate.

## 11.2 Notification details

Where permissions allow, include: - Salesperson. - Agency. -
Contact/member. - Contact email. - Hotel(s) and season(s). - Selected
rate option. - Final quoted price and currency. - Recipient scope. -
Timestamp. - Email status. - Link to quote/contact.

Distinguish quote created, email sending, email sent and email failed.
Notification delivery failure must not delete the quote. Failed email
must never be labelled sent.

# 12. Internal CRM chat

The company wants WhatsApp-like chat **inside the CRM**; this is not
automatically WhatsApp integration.

Required: - Real-time text. - Image sharing. - Voice/audio messages. -
Playback. - `@name` mentions. - New-message and mention notifications. -
Group conversations. - Persistent message history. - Sender identity and
timestamps. - Unread counts. - Responsive mobile chat. - Access only for
authorized group members.

## 12.1 Group creation (CONFIRMED)

Only Admins can create internal chat groups. Do not implement
staff-request/approval flow unless the user changes this decision.

Still to confirm: - Who can add/remove members? - Can members leave
groups? - Can groups be archived/deleted? - Are direct messages
required? - Can Admins view all groups? - Are message edit/delete,
replies, reactions and search required?

## 12.2 Voice transcription

Confirmed: user chooses transcription language before transcription
starts.

-   Only offer languages supported by the chosen provider.
-   Test English, Sinhala and Singlish/mixed-language examples.
-   Do not promise perfect mixed-language accuracy.
-   Preserve original audio if transcription fails.
-   Provider, cost, privacy/consent, retention and language coverage
    remain open.
-   API keys must remain server-side.

## 12.3 Attachments and privacy

-   Store image/audio files in protected object storage, not as large
    binary data in ordinary database rows.
-   Restrict file types and sizes.
-   Use private storage/authorized or signed access.
-   Check group membership before showing attachments.
-   Confirm retention policy.

# 13. Sales Activities and voice notes

User clarified voice recording is a **Sales Activity**, not a booking
receipt.

Example discussion could mention a hotel, date and number of rooms, but
the full activity schema remains to be confirmed.

Suggested Add Activity form: - Travel Agency dropdown. - Member
dropdown. - Hotel dropdown. - Activity date. - Description/notes. -
Record Voice. - Audio playback preview. - Save Activity.

Activity list: - Staff. - Agency. - Member. - Hotel. - Date. - Short
description. - Voice attachment indicator. - View details.

Do not call it a booking or receipt unless company confirms.

# 14. Analytics and reports

Confirmed: - A separate Analytics tab. - Analyse CRM data. - PDF export.

Company conversation report concepts:

**Hotel-wise:** select hotel; show agencies, markets, rates given, rate
category (Red/Green/Yellow/Special 1/2/3), staff member, notes and
dates.

**Agency-wise:** select agency; show markets, contacts, hotels quoted,
rate categories/amounts, staff and dates.

**Market-wise:** select agency + market; show members and rates shared.

**Agency comparison:** compare agencies for a selected market where
rates are comparable.

Suggested dashboard analytics (only from real saved data): - Total
hotels/agencies/markets/members. - Rates shared this month. - Most
shared hotels. - Agency-wise sharing. - Market-wise distribution. -
Staff-wise sales activities. - Rate category distribution. - Email
success/failure metrics.

Suggested filters: - Hotel. - Agency. - Market. - Staff. - Date range. -
Rate type/category.

PDF export is confirmed. Excel export for Analytics is not confirmed,
although original PDF mentions Excel downloads for rate sheets/reports.

# 15. Whiteboard photo interpretation

Whiteboard shows: - CRM heading. - Travel Agency dropdown. - Example
Jetwing Travels. - Markets such as Indian / Europe. - Members such as
Sarith. - Some top-level labels/icons T / S / P whose meaning is not
confirmed. - Hotel rows such as Randoli, Beragala, H.H., H.S.H. -
Season/year columns such as 2026 Summer, 2026/27 Winter, 2027 Summer. -
Rate colour indicators. - Special rate details and Date In / Date Out. -
Triple Supplement, Single Reduction, BB Reduction and HB Double base.

The user specifically said the initial sketch is too complicated and
wants more user-friendly screens. Treat whiteboard as a workflow
reference, not final UI. Do not copy its crowded matrix literally.

# 16. UI/UX design system

User wants separate page mockup images and a much simpler interface.

## 16.1 Visual direction

-   Professional modern SaaS CRM.
-   Navy-blue left sidebar.
-   White workspace.
-   Light-grey cards and borders.
-   Blue primary buttons.
-   Simple icons.
-   Readable typography.
-   Rounded dropdowns and inputs.
-   Subtle shadows and spacing.
-   Minimal clutter.
-   Consistent design across every page.
-   Desktop-first but fully responsive.

Suggested palette: - Navy `#102344` - Blue `#1765CE` - Light background
`#F4F7FC` - White `#FFFFFF` - Rate colours: Red, Green, Yellow with text
labels.

## 16.2 Interaction principles

-   Dropdowns for Agency, Market, Member, Hotel and Season.
-   Search for long contact lists (\~1,000 records).
-   Conditional fields: show Market only when needed; show Member for
    Individual scope.
-   Wizard for sending rates.
-   Separate pages for separate tasks.
-   Rate cards for simple rate choices.
-   Avoid huge tables; use mobile-friendly cards or horizontal scrolling
    where needed.
-   Show recipient count before sending.
-   Preview email before sending.
-   Confirm before destructive actions or bulk send.
-   Show loading/success/failure states.
-   Mobile sidebar becomes hamburger/drawer.
-   Forms become single-column on mobile.
-   Charts resize.
-   Avoid page-wide horizontal scrolling.

## 16.3 Suggested navigation

1.  Dashboard
2.  Travel Agencies
3.  Markets & Members
4.  Hotels
5.  Rate Management
6.  Special Rates
7.  Rate Calculator / Hotel Rate Settings
8.  Share Rates
9.  Sales Activities
10. Analytics
11. Notifications
12. Team Chat
13. Settings

Original PDF may also require DMC and Property terminology. Keep
DMC-specific functions if confirmed by company; do not silently remove
them.

## 16.4 UI pages for separate image mockups

User requested separate prompts/designs for: 1. Login. 2. Dashboard. 3.
Travel Agencies. 4. Markets. 5. Members. 6. Hotels. 7. Hotel Seasons. 8.
Rate Management. 9. Special Rates. 10. Rate Calculator. 11. Share Rates
/ Email. 12. Sales Activities / Voice Notes. 13. Analytics / Reports.
14. Notifications / Activity History.

Additional screens to design: - Team Chat list and conversation. - Admin
group management. - User/role management. - Contact quote history. -
Excel import preview/validation. - Rate history/version comparison. -
Mobile variants.

Generated images are only visual references. They do not create
functional dropdowns, database actions, calculations, email sending or
chat.

# 17. Technology stack and architecture

Current direction: \| Layer \| Direction \| Status \| \|---\|---\|---\|
\| Frontend \| React + TypeScript \| Proposed direction \| \| Database
\| Supabase PostgreSQL \| Supabase confirmed \| \| Authentication \|
Supabase Auth \| Proposed/recommended \| \| Authorization \| PostgreSQL
RLS + server-side checks \| Required design approach \| \| File storage
\| Supabase Storage \| Proposed \| \| Hosting \| Vercel \| User wants
this \| \| Email \| Secure server-side/Edge Function + approved provider
\| Provider unconfirmed \| \| Scheduled jobs \| Secure scheduled
server-side process \| To confirm \| \| Source control \| Git/GitHub \|
Recommended; company policy to confirm \|

Supabase uses PostgreSQL, not MySQL.

Architecture: 1. Staff/Admin open browser app on desktop/tablet/mobile.
2. React/TypeScript frontend deployed on Vercel. 3. Supabase Auth
handles login. 4. Supabase PostgreSQL stores records. 5. RLS and secure
server-side functions enforce access. 6. Supabase Storage stores
protected files/audio/images if approved. 7. Edge/server-side functions
send emails and perform privileged actions. 8. Scheduled process handles
confirmed expiry alerts. 9. Supabase Realtime may support
chat/notifications. 10. Quote/email/activity events are logged.

## 17.1 Security rules

-   Never expose Supabase `service_role` key in frontend.
-   Never expose email provider API keys in browser code.
-   Keep secrets in approved server-side environment/secrets.
-   Use RLS for private/company records.
-   Validate permissions server-side as well as in database policies.
-   Hiding a button is not security.
-   Validate quote recipient and agency-specific rate relationship
    before sending.
-   Protect special/VIP prices.
-   Save immutable quote snapshots.
-   Restrict file type/size and protect attachments.
-   Use least-privilege access.
-   Confirm company approval before storing real company/customer data
    in personal cloud accounts.
-   Separate development and production data where practical.
-   Establish backup/retention policy.

# 18. Conceptual database design

This is a starting point, not final SQL. Inspect Excel sheets and
confirm business rules before migrations.

## 18.1 Users and permissions

Possible: - `profiles` / `user_profiles`: Supabase Auth user ID, display
name, email, role, status. - `user_permissions`: extra permission such
as rate management.

Roles: Admin and Staff. Admin grants rate-management permission. Prevent
users from granting themselves privileges.

## 18.2 Agency hierarchy

Possible: - `travel_agencies` - `markets` (belongs to agency) -
`agency_members` / `travel_agency_contacts` (belongs to agency and
market)

Possible member fields: `id`, `agency_id`, `market_id`, `name`, `email`,
`phone`, `position`, `member_code`, `status`, `created_by`,
`created_at`, `updated_at`.

Agency members are not Auth users.

## 18.3 Hotels and seasons

Possible: - `hotels` (or `properties`, depending on final
terminology). - `hotel_seasons`. - `hotel_rate_configurations`.

Season fields may include hotel, label, year/season code,
date_in/date_out and audit metadata.

## 18.4 Rates

Possible: - `rate_sheets` / `hotel_rate_sheets`. - `rate_details`. -
`rate_calculation_rules`. - `rate_versions`. - `agency_special_rates`.

Rate detail may include hotel, season, room type, meal plan, occupancy,
rate category, currency, amount, validity, status, version, created_by
and updated_by. Final fields depend on Excel and company rules.

## 18.5 Special rates

Possible fields: - agency_id - hotel_id - season_id or rate_sheet_id -
special_type (1, 2 or 3) - amount/currency - date_in/date_out -
note/reason - created_by - timestamps

Conceptual only; confirm exact agency/hotel/season relationship.

## 18.6 Quotes and quote items

Possible: - `rate_quotes` / `rate_shares` - `rate_quote_items` -
`quote_recipients` - `quote_email_attempts`

Quote snapshot should preserve: - Contact/agency identity. - Recipient
email at send time. - Hotel and season. - Rate sheet/version
reference. - Selected rate option. - Final quoted amount/currency. -
Relevant room/meal/validity details. - Salesperson. - Creation/send
timestamps. - Email status/failure details.

A later rate update must not change historical quote values.

## 18.7 Sales activities

Possible: - `sales_activities` - `sales_activity_attachments`

Fields may include staff, agency, member, hotel, activity date,
description, voice attachment reference and created_at.

## 18.8 Chat and notifications

Possible: - `chat_groups` - `chat_group_members` - `chat_messages` -
`chat_attachments` - `message_mentions` - `user_notifications` -
`voice_transcriptions`

Only Admin creates groups. Only authorized group members can read/post.

## 18.9 Audit/import/expiry

Possible: - `audit_logs` - `rate_change_history` - `import_batches` -
`import_errors` - `expiry_notification_logs` if expiry alerts remain in
scope.

Use foreign keys, constraints, indexes, PostgreSQL types, safe deletion
behavior and RLS. Do not create every suggested table without validating
the actual workflow.

# 19. Excel import and migration

Company will provide Excel sheets for approximately 1,000 contacts and
hotel rates.

Required process: 1. Inspect all workbooks/sheets. 2. Read actual
headers, rows, formulas and formats. 3. Identify agency, market, member,
hotel, season and rate data. 4. Map source columns to database fields.
5. Detect missing values, duplicates and inconsistent names. 6. Check
currency and number formats. 7. Understand formulas; do not assume
values are simple. 8. Build import preview. 9. Validate before insert.
10. Import safely in batches. 11. Keep source file/import batch
metadata. 12. Produce rejected-row/error report. 13. Verify imported row
counts and sample records.

Do not guess workbook structure before the user uploads it.

# 20. Email requirements --- keep workflows distinct

## 20.1 New agency-contact quote workflow

Confirmed: - Saved agency contact is recipient. - Individual / Entire
Market / Entire Agency scopes. - Select all/one/multiple hotels. -
Choose rate per hotel. - Rate details in email body. - Save exact quote
and recipient. - Notify fixed Sales Team group. - Do not expose internal
labels/cost/margins by default.

## 20.2 Original DMC/rate-sheet workflow

Original PDF requires: - Select property/hotel. - Select rate sheet. -
Select one or more DMCs. - Send PDF and/or Excel. - Track history.

Earlier clarification also included sending rate sheets and expiry-alert
emails. Keep this distinct until company says otherwise.

## 20.3 Still to confirm

-   Approved email provider.
-   Sender email/domain.
-   Company branding/wording.
-   Whether original DMC flow still needs PDF/Excel.
-   Send separately vs grouped recipients.
-   Retry policy.
-   Failed-send handling.
-   Delivery status vs open/click tracking.

All sending must be secure server-side.

# 21. Development roadmap for one intern developer

Build and test incrementally.

## Phase 0 --- Requirements/setup

1.  Read this handover and original PDF.
2.  Confirm open rules.
3.  Receive and inspect Excel files.
4.  Confirm company approval for Supabase/Vercel/email and real data.
5.  Create repository under company policy.
6.  Set up React + TypeScript.
7.  Establish folder structure, linting and formatting.
8.  Set up Supabase development project.
9.  Configure environment variables safely.
10. Create design system and responsive app shell.

**Deliverable:** Running starter app, agreed scope, repository and
initial architecture.

## Phase 1 --- Authentication/permissions

1.  Login/logout.
2.  User profile.
3.  Admin/Staff roles.
4.  Admin-managed rate permission.
5.  RLS policies.
6.  Test direct API access as unauthorized user.
7.  Test route/session protection.

**Deliverable:** Secure role-aware app.

## Phase 2 --- Agency hierarchy

1.  Agency CRUD.
2.  Market CRUD linked to agency.
3.  Member CRUD linked to agency/market.
4.  Search name/email.
5.  Duplicate handling.
6.  Contact detail and quote history placeholder.
7.  Excel import pipeline after inspecting source files.

**Deliverable:** Agency → Market → Member module.

## Phase 3 --- Hotels/seasons

1.  Hotel CRUD.
2.  Hotel details.
3.  Season/year records.
4.  Date In/Date Out.
5.  Search.
6.  Import hotel data if provided.

**Deliverable:** Hotel and season management.

## Phase 4 --- Rate configuration

1.  Inspect Excel and formulas.
2.  Design schema/versioning.
3.  Configure hotel-specific HB Double/base and supplements/reductions.
4.  Implement confirmed formulas.
5.  Red/Green/Yellow rates.
6.  Agency-specific Special Rates 1--3.
7.  Rate-management permissions.
8.  Audit changes.
9.  Test calculations/visibility.

**Deliverable:** Protected rate management.

## Phase 5 --- Quote/share rates

1.  Contact quote history.
2.  Recipient scope selector.
3.  Recipient search/count.
4.  Select all/one/multiple hotels.
5.  Select season.
6.  Choose Red/Green/Yellow/Custom.
7.  Validate Custom price.
8.  Review quote.
9.  Save immutable snapshot.
10. Secure email body template.
11. Send and log attempts/retries.
12. Prevent accidental duplicates.
13. Test special-rate recipient protection.

**Deliverable:** Quote and email workflow.

## Phase 6 --- Sales Team notifications

1.  Fixed Admin-managed Sales Team group.
2.  Notify group after quote events.
3.  Show quote details/email status.
4.  Link to quote/contact.
5.  Ensure notification failure does not invalidate quote.

**Deliverable:** Internal notifications.

## Phase 7 --- Original DMC workflow and expiry

1.  Confirm whether separate DMC workflow remains.
2.  Build DMC records/property links if required.
3.  Send rate sheets in confirmed formats.
4.  Store send history.
5.  Confirm expiry rules.
6.  Add scheduled job only after timing/recipients confirmed.

**Deliverable:** Original PDF communication requirements.

## Phase 8 --- Internal chat

1.  Admin creates groups.
2.  Membership management per confirmed policy.
3.  Real-time text.
4.  Persistent history.
5.  Unread counts.
6.  Mentions.
7.  Notifications.
8.  Protected image attachments.
9.  Voice messages/playback.
10. Language-selected transcription after provider/privacy/budget
    approval.

**Deliverable:** Internal chat.

## Phase 9 --- Sales activities

1.  Add activity form.
2.  Link agency/member/hotel/staff.
3.  Activity date and notes.
4.  Voice note attachment.
5.  Activity history/search.

**Deliverable:** Sales activity module.

## Phase 10 --- Analytics

1.  Hotel-wise reports.
2.  Agency-wise reports.
3.  Market-wise reports.
4.  Rate comparison.
5.  Staff-wise activity.
6.  Email status metrics.
7.  PDF export.
8.  Excel export only if confirmed.

**Deliverable:** Analytics/reporting.

## Phase 11 --- Testing/deployment

1.  Functional tests.
2.  RLS/permission tests.
3.  Email success/failure tests.
4.  Quote snapshot tests.
5.  Special-rate confidentiality tests.
6.  Chat membership/attachment tests.
7.  Desktop/tablet/mobile tests.
8.  Performance checks.
9.  Backup/restore plan.
10. Production deploy to Vercel/Supabase after company approval.
11. Staff UAT.
12. Handover and staff guide.

**Deliverable:** Tested CRM and technical handover.

# 22. Testing checklist

## Security/access

-   Admin can perform Admin tasks.
-   Staff cannot perform Admin-only tasks.
-   Only Admin/authorized Staff edit protected rate configuration.
-   Agency contacts cannot log in.
-   Non-members cannot read private chat.
-   Direct API calls cannot bypass RLS.
-   Secrets are absent from frontend bundles.

## Agency hierarchy

-   Agency can have multiple markets.
-   Market belongs to correct agency.
-   Member belongs to correct agency/market.
-   Search works for 1,000+ contacts.
-   Duplicate email handling works.
-   Import errors are visible and recoverable.

## Hotels/rates

-   Hotel can have multiple seasons.
-   Rates link to correct hotel/season.
-   Calculations match confirmed formulas.
-   Red/Green/Yellow labels are correct.
-   Special 1--3 are agency-specific.
-   Date In/Out and notes save.
-   Creator/updater is recorded.
-   Historical quote remains unchanged after rate update.

## Quote/email

-   Individual sends only to selected member.
-   Market sends only to selected market.
-   Agency sends only to agency members.
-   All/one/multiple hotel selection works.
-   Per-hotel rate selection works.
-   Custom price validation works.
-   Email body shows correct final rates.
-   Internal labels/cost/margins are not exposed.
-   Recipient count is correct.
-   Failure is not labelled sent.
-   Retry is separately traceable.
-   Duplicate sends are mitigated.
-   Quote snapshot remains unchanged.

## Notifications/chat

-   Fixed Sales Team group gets correct notifications.
-   Each group member receives notification.
-   Email status is accurate.
-   Notification failure does not delete quote.
-   Only group members can access chat.
-   Realtime messages and history work.
-   Unread counts and mentions work.
-   Attachments are protected.
-   Voice playback works.
-   Language is selected before transcription.
-   Failed transcription preserves audio.

## Analytics/responsive

-   Filters return correct data.
-   Charts use real data.
-   PDF export is readable.
-   Mobile sidebar works.
-   Forms fit narrow screens.
-   Tables are usable on phones.
-   Chat composer is usable on mobile.

# 23. Open questions --- never guess

## Pricing/calculation

1.  Exact Red/Green/Yellow values.
2.  Exact Single, Double, Triple, BB and HB formulas.
3.  Currency/currencies.
4.  Per room/night/person?
5.  Room types, meal plans, child policies, occupancy.
6.  Rate configuration granularity: hotel, season, agency, room type or
    combination.
7.  Can Custom be lower than Red? Margin limits?
8.  Special rate combinations across hotel/season/agency.
9.  Any member-specific special rate exception?

## Email

10. Approved provider and sender domain.
11. Company wording/branding.
12. Does original DMC flow still need PDF/Excel attachments?
13. Send separate email per member or grouped?
14. Retry/failure policy?

## Expiry/update

15. Does original PDF expiry-alert requirement remain?
16. If yes, lead times and recipients?
17. Is there a monthly reminder or only manual monthly updates?
18. What rate history/version information must be retained?

## Contacts/data

19. Member code format?
20. Are duplicate names blocked or only duplicate emails?
21. Actual Excel sheets/columns?
22. Are phone, position and market mandatory?

## Chat/voice

23. Direct messages required?
24. Who can add/remove group members?
25. Can members leave?
26. Can groups be archived/deleted?
27. Replies/reactions/edit/delete/search?
28. Attachment types/size limits?
29. Transcription provider and budget?
30. Supported languages?
31. Consent and retention?
32. Push/email notifications when browser is closed?

## Reports

33. PDF branding/layout?
34. Excel export in Analytics?
35. Management's priority metrics?

# 24. Daily development tracking template

For each working day, record:

**Date:**\
**Day / Phase:**\
**Goal:**

### Tasks completed

-   [ ] Task 1
-   [ ] Task 2

### Files created/modified

-   `path/to/file`

### Database changes

-   Tables / migrations / policies.

### Tests performed

-   What was tested?
-   Expected result?
-   Actual result?

### Issues / blockers

-   Error message.
-   What was tried.
-   Current status.

### Company decisions confirmed

-   Only record actual confirmed decisions.

### Next working day

1.  Next task.
2.  Next task.
3.  Test to perform.

Do not mark a task complete merely because code was written. Complete
means it runs and expected behavior has been tested.

# 25. Current status snapshot

## Confirmed

-   WINDOW COMPANIES CRM for sales/marketing company working with
    partner hotels and travel agencies.
-   One intern developer; 5--15 internal staff.
-   No existing CRM/database server.
-   Supabase selected; Vercel desired for web hosting.
-   Admin and Staff roles.
-   Agency → Market → Member hierarchy.
-   Agency members are contact profiles only, no external login.
-   Search contacts by name/email and view quote history.
-   Approximately 1,000 existing contacts will be supplied in Excel.
-   Hotels have seasons/year-based rate structures.
-   Red = Lowest; Green = Normal; Yellow = Highest.
-   Hotel-specific calculation settings.
-   Special Rates 1, 2, 3 are agency-specific.
-   No Admin approval needed to create special rates.
-   Admin and authorized Staff can edit protected rates.
-   Rates given by staff visible to other staff according to
    permissions.
-   Individual / Entire Market / Entire Agency recipient scopes.
-   Select all/one/multiple hotels.
-   New agency quote rates are in email body.
-   Fixed Sales Team group receives rate-share notifications.
-   Only Admin creates chat groups.
-   Internal chat: text, images, voice, mentions, notifications,
    history.
-   User selects transcription language before transcription.
-   Voice recording is a Sales Activity.
-   Analytics tab and PDF export.
-   Clean, modern, simple, responsive UI.
-   Separate pages/dropdowns preferred over crowded all-in-one screens.

## Proposed / technical confirmation needed

-   React + TypeScript.
-   Supabase Auth and Storage.
-   RLS and server-side/Edge Functions.
-   Tailwind CSS or another consistent UI system.
-   Git/GitHub.
-   Supabase Realtime for chat.
-   Email provider and scheduled job provider.

## Still open

-   Actual Excel workbooks and formulas.
-   Real rate amounts/currencies.
-   Room/meal/occupancy rules.
-   Email provider/sender.
-   Whether original DMC PDF/Excel workflow remains separate.
-   Whether expiry alerts remain and schedule.
-   Chat membership/direct-message rules.
-   Transcription provider, languages, privacy, cost and retention.
-   Exact analytics metrics/report layout.

# 26. Immediate next practical steps

1.  Confirm the user's current project folder and existing code. Do not
    assume the repository is empty.
2.  Ask the user to upload company Excel files when available.
3.  Inspect workbook sheets, columns, formulas and sample data.
4.  Finalize data model and RLS matrix using actual data and confirmed
    workflows.
5.  Build React + TypeScript app shell and navigation.
6.  Set up Supabase development project securely.
7.  Build and test authentication and Admin/Staff permissions.
8.  Build Agency → Market → Member module first.
9.  Continue module by module using the roadmap.

# 27. Working agreement

The user is a solo intern developer and needs practical support from
planning through implementation.

The assistant should: - Explain in simple English or Sinhala/Singlish
depending on the user's language. - Give one step at a time when
requested. - Avoid overwhelming the user with too many tasks at once. -
For code, state exact file path, whether to create/replace, complete
code, commands and testing steps. - Help debug actual errors from
screenshots/logs. - Keep confirmed decisions and open questions
visible. - Prefer maintainable, secure, beginner-friendly solutions. -
Never claim deployment, email, database operation, import, chat or
feature succeeded without evidence. - Update this handover after major
decisions/milestones.

**This is the consolidated master memory for WINDOW COMPANIES CRM. New
explicit company decisions from the user take precedence over older
unconfirmed notes.**
