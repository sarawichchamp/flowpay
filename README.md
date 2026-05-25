# FlowPay

FlowPay is a mobile-first shared finance app for couples. It centers on a shared food wallet, flexible billing cycles, reimbursements, installments, OCR receipt capture, and monthly net settlement.

When `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `FLOWPAY_HOUSEHOLD_CODE` are configured, the app runs in production mode with a shared household access code and Supabase-backed data writes. Without them, it falls back to demo mode for local evaluation.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Framer Motion
- Recharts
- Supabase Auth, PostgreSQL, Storage, Realtime
- Tesseract.js OCR
- PWA manifest and service worker

## Structure

- `app` - App Router pages and shell
- `features` - product modules
- `components` - reusable UI/providers
- `services` - settlement, OCR, Supabase, notifications
- `repositories` - database access layer
- `types` - domain and generated-style database types
- `utils` - formatting and validation
- `supabase` - SQL schema and storage policies
- `docs` - deployment and setup guide

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```

If Windows blocks optional postinstall scripts, use:

```bash
npm install --ignore-scripts
```
