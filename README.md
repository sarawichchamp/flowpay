# FlowPay

FlowPay is a mobile-first shared finance app for couples. It centers on a shared food wallet, flexible billing cycles, reimbursements, installments, OCR receipt capture, and monthly net settlement.

When `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FLOWPAY_MEMBER_1_NAME`, `FLOWPAY_MEMBER_1_EMAIL`, `FLOWPAY_MEMBER_2_NAME`, and `FLOWPAY_MEMBER_2_EMAIL` are configured, the app runs in production mode with Supabase-backed data writes. Only those two pre-created Supabase Auth users are allowed into the household. They sign in with their assigned email/password and can optionally add passkeys for biometric sign-in on supported devices. Without that configuration, it falls back to demo mode for local evaluation.

For Home Screen push notifications, also configure `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.

## Production Auth Setup

1. In Supabase Auth, disable public self-sign-up.
2. Manually create the two household users in Supabase Auth with their own passwords.
3. Set:
   - `FLOWPAY_MEMBER_1_NAME`
   - `FLOWPAY_MEMBER_1_EMAIL`
   - `FLOWPAY_MEMBER_2_NAME`
   - `FLOWPAY_MEMBER_2_EMAIL`
4. Keep Passkeys/WebAuthn enabled only if you want biometric sign-in after the first password login.

FlowPay production mode will not auto-create users. If either configured household account is missing in Supabase Auth, the app will fail loudly instead of creating a new account automatically.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Framer Motion
- Recharts
- Supabase Auth, PostgreSQL, Storage, Realtime
- Web Push via service worker for installed mobile PWA notifications
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
npm run qa:settlement
npm run test:settlement
npm run qa:business-rules
npm run test:business-rules
```

If Windows blocks optional postinstall scripts, use:

```bash
npm install --ignore-scripts
```

## QA Notes

- Settlement business rules: [docs/SETTLEMENT_RULES.md](/Users/lilymootoo/Documents/Codex project/Flowpay/flowpay/docs/SETTLEMENT_RULES.md)
- QA status and follow-up checklist: [docs/QA_CHECKLIST.md](/Users/lilymootoo/Documents/Codex project/Flowpay/flowpay/docs/QA_CHECKLIST.md)
