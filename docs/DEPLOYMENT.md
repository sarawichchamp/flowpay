# Deployment Guide

## Local

```bash
npm install --ignore-scripts
npm run dev
```

Open `http://localhost:3000`.

## Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Add environment variables from `.env.example`.
4. Deploy with the default Next.js preset.
5. Add your Vercel production URL to Supabase Google OAuth redirect URLs.
6. Generate VAPID keys with `npx web-push generate-vapid-keys` and add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to Vercel.

## Supabase

1. Run `supabase/schema.sql`.
2. Run `supabase/storage.sql`.
3. Configure Google OAuth redirect URLs.
4. Turn on Realtime for `notifications`.
5. Ensure built-in category rows exist from `supabase/schema.sql` before creating transactions.
6. Follow [docs/SQL_DEPLOY_CHECKLIST.md](/Users/lilymootoo/Documents/Codex project/Flowpay/flowpay/docs/SQL_DEPLOY_CHECKLIST.md) before applying schema changes to staging/production.

## Production Checklist

- Rotate service role keys and never expose them in the browser.
- Confirm RLS policies in Supabase policy simulator.
- Test OCR on Thai and English receipt samples.
- Verify PWA install prompt on Android Chrome and iOS Safari.
- Install the production app on Home Screen and verify push permission plus end-to-end delivery on one iPhone and one Android device.
- Add Vercel preview URL to Supabase Auth redirect URLs before QA.
