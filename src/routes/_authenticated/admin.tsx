import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Footer } from "@/components/Footer";
import {
  checkIsAdmin,
  listAllUsers,
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  deleteAccessRequest,
} from "@/lib/admin.functions";
import { buildUsersByEmail, getAccessRequestAcceptanceStatus } from "@/lib/access-request-status";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Feedblick Pomodoro" }] }),
  component: AdminPage,
});

// Minimal request-access approval page — a single table, no roles/RBAC system (see
// src/lib/admin-emails.ts), no invite-resend or platform-stats tabs like feedblick-stars' own
// 1100-line /admin has. Add those only once volume makes hand-approving in Supabase Studio (the
// fallback for anyone not on the allowlist) actually unwieldy.
function AdminPage() {
  const qc = useQueryClient();
  const check = useServerFn(checkIsAdmin);
  const list = useServerFn(listAllUsers);
  const listRequests = useServerFn(listAccessRequests);
  const approve = useServerFn(approveAccessRequest);
  const reject = useServerFn(rejectAccessRequest);
  const del = useServerFn(deleteAccessRequest);

  const { data: role } = useQuery({ queryKey: ["admin", "check"], queryFn: () => check({}) });
  const isAdmin = !!role?.isAdmin;

  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => list({}),
    enabled: isAdmin,
  });
  const usersByEmail = useMemo(() => buildUsersByEmail(users), [users]);

  const { data: requests = [] } = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => listRequests({}),
    enabled: isAdmin,
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const onApprove = async (id: string) => {
    setBusyId(id);
    try {
      await approve({ data: { requestId: id } });
      toast.success("Approved — an invite email is on its way.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not approve request.");
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id: string) => {
    setBusyId(id);
    try {
      await reject({ data: { requestId: id } });
      toast.success("Rejected.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reject request.");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    setBusyId(id);
    try {
      await del({ data: { requestId: id } });
      toast.success("Deleted.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <BrandMark />
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold">Admin</h1>

        {!isAdmin && (
          <p className="text-sm text-muted-foreground">You don't have access to this page.</p>
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Access requests ({requests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requests yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Accepted</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => {
                      const acceptance = getAccessRequestAcceptanceStatus(r, usersByEmail);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="max-w-[140px] truncate" title={r.name}>
                            {r.name}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={r.email}>
                            {r.email}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate" title={r.team_name}>
                            {r.team_name}
                          </TableCell>
                          <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="capitalize">{r.status}</TableCell>
                          <TableCell>
                            {acceptance.kind === "signed_in" && (
                              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                                Signed in {new Date(acceptance.lastSignInAt).toLocaleDateString()}
                              </span>
                            )}
                            {acceptance.kind === "not_signed_in" && (
                              <span className="text-xs text-muted-foreground">
                                Not signed in yet
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {r.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    disabled={busyId === r.id}
                                    onClick={() => onApprove(r.id)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busyId === r.id}
                                    onClick={() => onReject(r.id)}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === r.id}
                                onClick={() => onDelete(r.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer variant="minimal" />
    </div>
  );
}
