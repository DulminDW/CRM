# Technical Verification Report: Device Default Email Application Handoff Workflow

**Project:** WINDOW COMPANIES MANAGEMENT SYSTEM  
**Milestone:** Phase 9 – Rate Sharing, Device Email App Handoff & Confirmation Lifecycle  
**Timestamp:** November 11, 2026  
**Status:** Verification Passed & Quality Gates Satisfied

---

## 1. How the Browser Opens the Device Email Application

### 1.1 Standard `mailto:` Protocol Handshake
The CRM leverages the standard RFC 6068 `mailto:` URI scheme executed through the browser’s navigation context:
```
mailto:<recipient1@domain.com>,<recipient2@domain.com>?cc=<optional_cc>&subject=<encoded_subject>&body=<encoded_body>
```
1. **URI Encoding**: Subject and body strings are encoded with `encodeURIComponent`, converting newlines (`%0A`), spaces (`%20`), ampersands (`%26`), and currency symbols (`$`, `LKR`, `USD`, `€`) without corruption.
2. **Plain-Text Rate Layout**: `mailto:` does not reliably transfer HTML markup or file attachments across different email clients. Therefore, the CRM formats an aligned plain-text table with preserved line breaks showing:
   - Hotel name, contract season, and validity dates
   - Room type (`Double Room`), occupancy (`Double`), and meal plan (`Half Board / HB`)
   - Rate tier (`RED`, `GREEN`, `YELLOW`, or `CUSTOM`)
   - Exact quoted rate with currency
   - Contract reference and external terms & conditions
   - Volume commitments and special conditions
3. **Data Confidentiality**: Internal-only notes and unverified rates are strictly excluded from the outgoing mail payload.
4. **Trigger Mechanism**: Executed via `window.location.href = mailtoUrl`, which hands off control to the operating system's registered email handler.
5. **Direct Gmail Webmail Compose**: An alternative **"Continue in Gmail"** button constructs `https://mail.google.com/mail/?view=cm&fs=1&...` in a new tab for staff working in Google Workspace webmail.

---

## 2. Platform-Specific Behavior (Android, iPhone, Desktop)

| Platform | Behavior | Edge Cases & Fallbacks |
|---|---|---|
| **Android Phone** | Invokes the Android OS Intent Resolver. If Gmail is default, it opens Gmail compose with `To`, `CC`, `Subject`, and body pre-filled. | If multiple email apps exist, the OS prompts the user to select one. |
| **iPhone (iOS)** | Opens Apple Mail (or Gmail / Outlook if set as default in iOS Settings) with all fields pre-filled. | Character and newline preservation functions identically. |
| **Desktop (Windows / Mac)** | Invokes the operating system's default protocol client (e.g. Outlook, Windows Mail, macOS Apple Mail). | If no default client is mapped, the user can use **"Continue in Gmail"** or click **"Copy Email"** / **"Copy Email Body"** and paste directly into any webmail. |

> [!NOTE]
> The operating system and user settings decide which email handler launches. The browser cannot force a specific client if none is configured. One-click clipboard copy buttons provide an immediate fallback.

---

## 3. How the CRM Records Email Handoff and User Confirmation

Because a browser cannot determine whether the user actually pressed "Send", edited the draft, or closed their email app, the CRM **never falsely marks quotes as `SENT`** upon clicking the button.

```
[ User Previews Rate Email in CRM ]
                  │
                  ▼
       [ "Open in Email App" ]
                  │
                  ├─► Freezes immutable quote snapshot
                  ├─► Records opened_in_app_at timestamp
                  ├─► Sets email_status = 'OPENED_IN_EMAIL_APP'
                  │
                  ▼
[ Device Email App Opens with Pre-filled Content ]
                  │
                  ▼
  [ Confirmation Modal in CRM Browser:
    "Did you successfully send this email?" ]
            ┌─────┴─────┐
            ▼           ▼
  ["Yes, I Sent It"]   ["Not Sent Yet"]
            │                   │
            │                   └─► Keeps status = 'OPENED_IN_EMAIL_APP'
            │                       Leaves draft available to re-open
            │
            └─► Sets email_status = 'USER_CONFIRMED_SENT'
                Saves confirmed_by (staff user ID)
                Saves confirmed_at (timestamp)
                Saves confirmation_notes
```

### Distinction in Quote History
- **`OPENED_IN_EMAIL_APP`**: Blue status badge indicating the device handoff took place, with a **"Re-open App"** button.
- **`USER_CONFIRMED_SENT`**: Emerald status badge indicating the staff member confirmed manual dispatch, preserving the confirmer's identity and timestamp.
- **`SENT`**: Reserved strictly for automated server-side provider delivery.

---

## 4. What Cannot Be Automatically Verified

1. **Third-Party Email Application State**: Web browsers run in a secure sandbox and cannot read external processes or know whether the user clicked "Send", discarded the draft, or lost connectivity inside their email client.
2. **Local Operating System Mail Mappings**: If a desktop machine has no default mail application assigned, `mailto:` will fail silently at the OS level. The CRM provides explicit copy fallbacks (`Copy Subject`, `Copy Email Body`, `Copy Emails`, `Copy Email (All)`) to handle this without data loss.
3. **URL Query Length Thresholds**: Mailto links exceeding ~2,000 characters may be truncated by certain older mobile mail handlers. The CRM calculates query length and warns the user if manual copying is recommended.

---

## 5. Verification & Test Results

| Suite / Test | Command | Status | Result |
|---|---|---|---|
| **TypeScript Compilation** | `npx tsc -b` | **PASS** | Exit code 0, zero type errors |
| **Automated Tests** | `node scripts/run-tests.cjs` | **PASS** | 11/11 test suites passed (101 individual assertions) |
| **Vite Production Build** | `npm run build` | **PASS** | Complete production bundle built successfully |
| **Git Diff Syntax & Conflicts** | `git diff --check` | **PASS** | Exit code 0, zero conflict markers |

### Test Suite 11 (Device Email App Handoff Suite) covers:
- Safe URL encoding of subject, body, line breaks, and currency characters (`$`, `LKR`, `USD`).
- Rejection of empty recipients.
- Protection against premature `SENT` status marking upon `mailto:` execution.
- Handoff status transition to `OPENED_IN_EMAIL_APP`.
- Confirmation lifecycle transitions for both "Yes, I Sent It" (`USER_CONFIRMED_SENT`) and "Not Sent Yet" (`OPENED_IN_EMAIL_APP`).
- URL length safety evaluation and fallback copy triggers for payloads >2,000 characters.

---

## 6. Safety & Scope Adherence
- **No migrations deployed**: Draft migration `20261111000014_hotel_rate_configs_and_history.sql` remains unapplied.
- **No Git commits or pushes**: All working tree changes remain staged/unstaged locally.
- **Phase 7 UI modifications**: All responsive layout improvements across `MainLayout.tsx`, `Navbar.tsx`, etc., remain preserved.

