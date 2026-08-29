// Single-admin allowlist for the request-access approval flow (/admin) — no roles table yet,
// unlike feedblick-stars' full has_role RBAC system, since there's exactly one admin today.
// Checked against the signed-in user's own JWT email claim (admin.functions.ts's assertAdmin),
// never trusted from the client. Add more addresses here if a second person ever needs to
// approve requests; move to a real roles table only if that list actually grows.
export const ADMIN_EMAILS = ["sergio.vargas@biodatum.io"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
