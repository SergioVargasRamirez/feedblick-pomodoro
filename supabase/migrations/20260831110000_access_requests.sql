-- Request-access flow, ported from feedblick-stars' own access_requests table (its final
-- shape, after that repo's own iteration — team_name instead of restaurant_name, no
-- restaurant_email duplicate, no confirmation_document_url column, since none of those extra
-- fields were ever actually used there either). Signups go through this instead of the open
-- /auth "Create account" form: someone applies with name/email/team, an admin approves them by
-- hand (see src/lib/admin-emails.ts — no roles table yet, just a single-admin email allowlist,
-- since there's exactly one admin right now), and approval sends a real Supabase Auth invite
-- email with a set-password link.
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  team_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_at timestamptz,
  -- Set once approved — the real account this request produced. Nullable because a request is
  -- always inserted before any account exists; ON DELETE CASCADE so deleting the account this
  -- request produced also removes the now-stale request row automatically.
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX access_requests_status_idx ON public.access_requests (status, created_at DESC);
CREATE INDEX access_requests_user_id_idx ON public.access_requests (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone may apply; nobody may read via the anon/authenticated roles at all — the admin page
-- reads this table through the service-role client (client.server.ts), which bypasses RLS, so
-- no SELECT policy is needed (and one would only risk leaking every applicant's name/email).
CREATE POLICY "Anyone can submit an access request" ON public.access_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT INSERT ON public.access_requests TO anon, authenticated;
GRANT ALL ON public.access_requests TO service_role;
