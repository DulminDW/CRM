# WINDOW COMPANIES CRM – ENVIRONMENT VARIABLES SPECIFICATION

This document outlines all environment variables required by WINDOW COMPANIES CRM. 

> [!CAUTION]
> Never commit actual API keys, database credentials, or JWT secrets to version control. Keep `.env.local` strictly in `.gitignore`.

---

## 1. Required Frontend Variables (`.env.local`)

| Variable Name | Required | Default / Format | Description |
| :--- | :---: | :--- | :--- |
| `VITE_SUPABASE_URL` | **Yes** | `https://<project-ref>.supabase.co` | The HTTPS endpoint URL of your Supabase hosted project instance. |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | `eyJhbGciOi...` | The client-side public Anonymous key used for PostgREST queries subject to RLS. |
| `VITE_APP_ENV` | Optional | `development` \| `staging` \| `production` | Dictates runtime logging and mock behavior. |
| `VITE_APP_TITLE` | Optional | `WINDOW COMPANIES CRM` | Application title rendered in header and page document titles. |

---

## 2. Optional / Integration Service Variables (Future Phases)

These variables will be configured once external vendor accounts and company credentials are provided:

| Variable Name | Integration Purpose | Security Scope |
| :--- | :--- | :--- |
| `RESEND_API_KEY` or `SENDGRID_API_KEY` | Transactional email dispatch for automated quote delivery. | **Server-side only** (Edge Functions / Backend) |
| `COMPANY_MAIL_FROM` | Sender email address (e.g., `rates@windowcompanies.com`). | Server-side / Edge Functions |
| `OPENAI_API_KEY` or `SPEECH_TO_TEXT_KEY` | Automated speech-to-text transcription for Sales Voice Notes. | Server-side / Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Administrative migrations and bulk provisioning scripts. | **STRICTLY SERVER-SIDE / LOCAL SCRIPTS ONLY** |

---

## 3. Template Configuration (`.env.example`)

You can create a `.env.local` file by copying the following template:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here

# Application Configuration
VITE_APP_ENV=development
VITE_APP_TITLE="WINDOW COMPANIES CRM"
```

