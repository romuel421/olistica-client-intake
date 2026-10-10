# Olistica Client Intake Data Store — Supabase + GitHub Pages

## What this upgrade changes
- Uses Supabase email/password authentication instead of the hardcoded `admin/admin123` localStorage login.
- Stores client records in a shared Supabase PostgreSQL table so authorized staff can access records on multiple devices.
- Adds an admin-only staff account creation panel backed by a Supabase Edge Function.
- Keeps the intake form, OCR, visit history, search, Word export, JSON export/import.
- Refreshes the record list when other staff make database changes (Realtime must be enabled for the table).

## 1. Create a Supabase project
1. Create a project at https://supabase.com/ and keep its database password private.
2. Open **SQL Editor**, paste and run `olistica-supabase-setup.sql`.
3. Open **Project Settings → API** (or API Keys). Copy the Project URL and the publishable/anon key.
4. In the HTML, replace `https://YOUR_PROJECT_ID.supabase.co` and `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY` with your own values. The publishable/anon key is intended for browser use only because Row Level Security is enabled. **Never put the service-role key in HTML or GitHub.**

## 2. Create and promote the first administrator
1. In Supabase Dashboard → Authentication → Users, create the first user with the admin email/password. If email confirmation is required by your project, confirm it.
2. Run this SQL after replacing the email:
   ```sql
   update public.profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL';
   ```
3. Sign in on the site with that email/password. The admin panel should appear. All accounts created through the panel get the `staff` role automatically.

## 3. Deploy the `create-staff` Edge Function
The file in this bundle is `create-staff-index.ts`. In a local Supabase CLI project, put it at `supabase/functions/create-staff/index.ts` and add the standard CORS helper at `supabase/functions/_shared/cors.ts`:

```ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

Then deploy with the Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy create-staff
```

`SUPABASE_URL` is normally provided to Edge Functions automatically; if needed, set it as a function secret too. Keep `SUPABASE_SERVICE_ROLE_KEY` only in Supabase secrets, never in the repository or browser.

## 4. Publish with GitHub Pages
1. Rename `Olistica_Client_Intake_DataStore_Supabase.html` to `index.html`.
2. Put `index.html` in the root of a GitHub repository and commit/push it.
3. In repository **Settings → Pages**, select the branch and root folder, then save.
4. In Supabase Authentication settings, configure your Site URL and allowed redirect URLs to include the GitHub Pages URL, e.g. `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
5. Open the published page and sign in. Do not add the service-role key to GitHub Secrets for this static HTML; the Edge Function secret belongs in Supabase.

## 5. Important notes before real client data
- This is a baseline migration. It does **not** automatically import data from old browser localStorage. Export the old app's JSON backup and restore it from the upgraded app after signing in; the restore replaces matching/current records, so make a backup first.
- Existing browser-only records remain on that browser until you export them. This new site cannot read another browser's localStorage.
- All authenticated staff can read/edit/delete client records. Only the admin role can create staff accounts. If you need different permissions (e.g. staff cannot delete), the database policies and UI should be tightened before launch.
- The current data model stores each client and all visits in one JSON record. Simultaneous edits to the same client from different devices can overwrite each other; a normalized client/visit schema with conflict handling is recommended for heavy multi-user use.
- This app handles personal information (names, phone numbers, hotel information and visit history). Restrict access to trusted staff, use strong unique passwords, keep backups securely, and verify your privacy obligations before publishing/using real customer data. HTTPS is provided by GitHub Pages.
- OCR is processed in the browser by Tesseract.js; users should review extracted text before saving.
