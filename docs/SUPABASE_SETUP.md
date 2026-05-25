# Supabase Setup

1. Create a Supabase project on the free tier.
2. In SQL Editor, run `supabase/schema.sql`.
3. In SQL Editor, run `supabase/storage.sql`.
4. Enable Authentication -> Providers -> Google.
5. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-vercel-domain.vercel.app/auth/callback`
6. Copy Project URL and anon key into `.env.local`.
7. Enable Realtime for `notifications` and `transactions` in Database -> Replication.
8. Create exactly two `profiles` rows after the first two users sign in, or add an `auth.users` trigger to create them automatically.

The schema is intentionally scoped to two profiles. RLS allows household-level access while keeping anonymous users out.
