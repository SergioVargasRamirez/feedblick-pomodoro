import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin-emails";

// Ported from feedblick-stars' admin.functions.ts (approve/reject/delete access requests, plus
// listing users for the "have they signed in yet" column), with its has_role RBAC check swapped
// for the single-admin email allowlist above, and the rejection email (a custom Resend edge
// function stars has and this app doesn't) dropped — rejecting just flips status for now.
function assertAdmin(context: { claims: { email?: string } }) {
  if (!isAdminEmail(context.claims.email)) throw new Error("Forbidden");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ isAdmin: isAdminEmail(context.claims.email) }));

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    return data.users.map((u) => ({
      email: u.email ?? "",
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));
  });

export const listAccessRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const approveAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) => data)
  .handler(async ({ context, data }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reqRow, error: fetchErr } = await supabaseAdmin
      .from("access_requests")
      .select("*")
      .eq("id", data.requestId)
      .single();
    if (fetchErr || !reqRow) throw new Error(fetchErr?.message ?? "Request not found");

    // Idempotency: a double-click on an already-approved row must not send a second invite.
    if (reqRow.status === "approved") return { ok: true };

    // Guard against inviting the same email twice from two separate request rows.
    const { count: dupCount, error: dupErr } = await supabaseAdmin
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", reqRow.email)
      .eq("status", "approved")
      .neq("id", data.requestId);
    if (dupErr) throw new Error(dupErr.message);
    if ((dupCount ?? 0) > 0) {
      throw new Error("An access request for this email has already been approved.");
    }

    // Without an explicit redirectTo, the invite link falls back to the Supabase project's bare
    // Site URL, which has no password-setting flow. /reset-password already knows how to pick up
    // a fresh session and prompt for a password (same page auth.tsx's "forgot password" uses).
    const origin = getRequestUrl({ xForwardedHost: true, xForwardedProto: true }).origin;
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      reqRow.email,
      {
        data: { name: reqRow.name, team_name: reqRow.team_name },
        redirectTo: `${origin}/reset-password`,
      },
    );
    if (inviteErr) throw new Error(inviteErr.message);

    // user_id links this row to the account it just produced — a real FK the database can
    // cascade on, and something deleteAccessRequest() checks before letting an admin delete a
    // still-live request.
    const { error: updateErr } = await supabaseAdmin
      .from("access_requests")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        user_id: invited.user?.id ?? null,
      })
      .eq("id", data.requestId);
    if (updateErr) throw new Error(updateErr.message);
    return { ok: true };
  });

export const rejectAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) => data)
  .handler(async ({ context, data }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("access_requests")
      .update({ status: "rejected", decided_at: new Date().toISOString() })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// The manual half of request cleanup — an approved or rejected row otherwise sits forever with
// no way to remove it. Refuses outright (rather than just warning) when the account it produced
// is still live: a live account normally means ON DELETE CASCADE already removed this row the
// moment that account was deleted, so reaching this check with a still-existing account means
// the row is genuinely still in active use.
export const deleteAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) => data)
  .handler(async ({ context, data }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reqRow, error: fetchErr } = await supabaseAdmin
      .from("access_requests")
      .select("user_id")
      .eq("id", data.requestId)
      .single();
    if (fetchErr || !reqRow) throw new Error(fetchErr?.message ?? "Request not found");
    if (reqRow.user_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(reqRow.user_id);
      if (userData?.user) {
        throw new Error(
          "This request is linked to an active account and can't be deleted manually.",
        );
      }
    }
    const { error } = await supabaseAdmin.from("access_requests").delete().eq("id", data.requestId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
