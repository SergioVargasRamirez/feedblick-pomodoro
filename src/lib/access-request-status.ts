// Whether an approved access-requests applicant has actually accepted their invite yet — the
// requests table's own status column only ever means "we sent an invite," never "they're in".
// Cross-references the request's email against the already-fetched user list (email/
// last_sign_in_at) rather than a new query — both are already loaded together on /admin.
// Ported from feedblick-stars, which introduced this exact pure function for the same reason.
export type AccessRequestAcceptanceStatus =
  | { kind: "not_applicable" } // pending or rejected — no invite was ever sent
  | { kind: "not_signed_in" } // invited, but no matching auth.users row has ever signed in
  | { kind: "signed_in"; lastSignInAt: string };

export function getAccessRequestAcceptanceStatus(
  request: { status: string; email: string },
  usersByEmail: Map<string, { last_sign_in_at: string | null }>,
): AccessRequestAcceptanceStatus {
  if (request.status !== "approved") return { kind: "not_applicable" };
  // Emails are matched case-insensitively -- Supabase normalizes auth.users.email to lowercase,
  // but access_requests.email is whatever the applicant literally typed into the request form.
  const user = usersByEmail.get(request.email.toLowerCase());
  if (!user?.last_sign_in_at) return { kind: "not_signed_in" };
  return { kind: "signed_in", lastSignInAt: user.last_sign_in_at };
}

export function buildUsersByEmail(
  users: Array<{ email: string; last_sign_in_at: string | null }>,
): Map<string, { last_sign_in_at: string | null }> {
  return new Map(users.map((u) => [u.email.toLowerCase(), { last_sign_in_at: u.last_sign_in_at }]));
}
