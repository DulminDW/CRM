# WINDOW COMPANIES CRM – BACKUP, DISASTER RECOVERY & DATA PRESERVATION

## 1. Overview & Objectives

This document establishes standard operating procedures for safeguarding data, handling hardware or platform failures, and executing point-in-time recovery for the WINDOW COMPANIES CRM system.

- **RPO (Recovery Point Objective):** Less than 1 hour for commercial rate and agency contracts.
- **RTO (Recovery Time Objective):** Less than 2 hours for full system restoration.

---

## 2. Automated PostgreSQL Backups (Supabase Cloud)

Supabase Cloud manages automated backups of the underlying PostgreSQL database:

1. **Daily Automated Snapshots:**
   - Taken once every 24 hours during low-traffic windows.
   - Retained for 7 days (Free tier) or 30 days (Pro / Enterprise tier).
2. **Point-In-Time Recovery (PITR):**
   - For production environments with Supabase Pro enabled, PostgreSQL WAL (Write-Ahead Logging) archives allow continuous restoration to any second within the retention window.

---

## 3. Manual Scheduled Dumps (pg_dump)

For local disaster preservation or secondary cold storage, the company should run scheduled logical database dumps:

### Schema & Data Export
```bash
# Dump complete schema and table data
pg_dump -h db.fvxtnitlsbzmcuphefmv.supabase.co -U postgres -d postgres -F c -b -v -f "backups/crm_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Schema-Only Export (For Migration Archiving)
```bash
pg_dump -h db.fvxtnitlsbzmcuphefmv.supabase.co -U postgres -d postgres --schema-only -f "backups/crm_schema_$(date +%Y%m%d).sql"
```

---

## 4. Storage Bucket Document Preservation

Signed hotel contracts and executed agreements are stored in the private Supabase Storage bucket `contract-documents`.

1. **Storage Replication:**
   - Supabase Storage is backed by AWS S3 (or Google Cloud Storage) with 99.999999999% (11 9's) durability.
2. **Cold Mirroring Script:**
   - Run a periodic synchronization script using AWS CLI / Supabase Storage API to mirror files to an offline local archive:
     ```bash
     # Example: Mirror bucket files using node storage downloader
     node scripts/sync-storage-documents.cjs
     ```

---

## 5. Disaster Recovery Runbook

In the event of database corruption, accidental catastrophic deletion, or platform outage:

1. **Step 1: Declare Incident & Lock Write Access:**
   - Place frontend into Maintenance Mode by setting `VITE_APP_ENV=maintenance` or updating Vercel redirect rules.
2. **Step 2: Inspect Latest Healthy Snapshot:**
   - Open Supabase Dashboard -> Database -> Backups.
   - Identify the timestamp immediately preceding the corruption event.
3. **Step 3: Trigger Restoration:**
   - Select the target snapshot and click **Restore**.
   - Alternatively, restore the latest `.dump` file to a fresh Supabase project:
     ```bash
     pg_restore -h <new-host> -U postgres -d postgres -v "backups/latest_clean.dump"
     ```
4. **Step 4: Verify Database Invariants:**
   - Run verification suite: `node scripts/run-tests.cjs`.
   - Confirm row counts across `hotels`, `agencies`, `contracts`, and `quotes`.
5. **Step 5: Lift Maintenance Mode:**
   - Point DNS / Vercel environment variables to restored instance.
   - Notify staff and resume normal operations.

