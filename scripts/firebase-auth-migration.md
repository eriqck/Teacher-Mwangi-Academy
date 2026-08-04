# Firebase Auth Migration

This app currently authenticates most users from `public.users`, not from Supabase Auth.
The password fields in `public.users` are generated with Node `crypto.scryptSync(password, salt, 64)`.

Use Firebase Auth `STANDARD_SCRYPT` import settings:

```bash
--hash-algo=STANDARD_SCRYPT
--mem-cost=16384
--parallelization=1
--block-size=8
--dk-len=64
```

## Export users from a Supabase DB backup

```bash
npm run export-firebase-auth -- "C:\Users\Eric\Desktop\db_cluster-29-07-2026@08-38-47.backup.gz" firebase-auth-users.json
```

This creates:

- `firebase-auth-users.json`: Firebase Auth import file.
- `firebase-auth-users.app-user-map.json`: app profile map with old user ID, role, phone, and name.

Do not commit these generated JSON files. They contain user emails and password hashes.

## Import into Firebase

Install and log in to Firebase CLI, then run:

```bash
firebase auth:import "firebase-auth-users.json" --hash-algo=STANDARD_SCRYPT --mem-cost=16384 --parallelization=1 --block-size=8 --dk-len=64
```

## Required test before production switch

1. Import only a small test batch first.
2. Try logging in with a known old email/password.
3. If login succeeds, import the full file.
4. Only after that should the live Next.js auth code be switched from custom sessions to Firebase Auth.

If Firebase rejects the hash settings or old passwords fail, use a reset-password migration instead of forcing the production switch.
