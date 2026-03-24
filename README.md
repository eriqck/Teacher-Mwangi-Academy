# Teacher Mwangi Academy

Teacher Mwangi Academy is a Next.js membership platform for selling Kenyan CBC and secondary school revision materials through parent and teacher accounts, Paystack checkout, Supabase-backed data, and protected member access.

## What is included

- Rebranded storefront for Teacher Mwangi Academy
- Catalog coverage for Grade 7, Grade 8, Grade 9, Grade 10, Form 3, and Form 4
- Parent subscriptions at `KSh 300/month`
- Teacher subscriptions at `KSh 150/month`
- Teacher scheme-of-work purchases at `KSh 30` per subject
- Signup, login, logout, and protected member dashboard
- Teacher-only admin upload area for revision files and schemes of work
- Supabase-ready storage for users, sessions, subscriptions, payments, and resources
- Supabase Storage-ready file uploads with local fallback during development
- Paystack checkout initialization and callback verification

## Stack

- Next.js 15
- React 19
- TypeScript

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy environment values:

```bash
copy .env.example .env.local
```

3. Update the Paystack, Supabase, and session env values in `.env.local`.

4. Start the app:

```bash
npm run dev
```

## Current storage

The app now supports a production Supabase backend and keeps [data/store.json](./data/store.json) only as a local-development fallback.

Uploaded files go to Supabase Storage when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured. Otherwise they fall back to `public/uploads/materials` and `public/uploads/schemes` during development.

## Vercel + Supabase launch path

1. Create a Supabase project.
2. Run the SQL in [supabase/schema.sql](./supabase/schema.sql).
3. Create a public storage bucket named `materials` or set `SUPABASE_STORAGE_BUCKET`.
4. Add the environment variables from `.env.example` to Vercel.
5. Deploy the app to Vercel.
6. Update `NEXT_PUBLIC_SITE_URL` and `PAYSTACK_CALLBACK_URL` to your real domain.
7. Test signup, login, uploads, payments, and level access on the deployed site.

## Admin uploads

Admin accounts can open `/admin` to:

- Upload subscriber revision materials
- Upload teacher schemes of work
- Save metadata such as level, subject, audience, and file links
- Review previously uploaded files from the browser

Public signup creates only `parent` and `teacher` subscriber accounts. To promote an existing user to admin locally, run:

```bash
npm run make-admin -- you@example.com
```

## Suggested next production steps

1. Add a migration/import script to move current local JSON data into Supabase.
2. Harden Paystack verification with webhook support and stricter idempotency handling.
3. Add row-level security and tighter admin-only storage rules if you later move off service-role-only server access.
4. Add password reset and email verification.
5. Add school and bulk-teacher plans if needed.

## Recommended data model

- `users`: account details, role, contact info
- `subscriptions`: plan, status, level access, renewal date
- `resources`: title, level, subject, file path, visibility
- `payments`: amount, phone number, checkout request id, receipt, status
- `scheme_purchases`: teacher one-time material purchases

## Important note on Paystack

The app now saves payment and subscription records before redirecting to Paystack, and updates them after Paystack verification on callback. Before going live, add stronger verification hardening, retries, idempotency handling, and a production database.

## Important note on deployment

Vercel does not provide durable local filesystem storage for this type of app, so production uploads should go to Supabase Storage and production records should live in Supabase Postgres rather than local files.
