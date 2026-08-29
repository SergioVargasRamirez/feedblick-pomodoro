import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, UserRound, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account · Feedblick Pomodoro" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between gap-2">
          <Link to="/dashboard" className="text-sm flex items-center gap-1 hover:underline">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center gap-2">
          <UserRound className="size-5 text-primary" />
          <h1 className="text-3xl font-bold">Account</h1>
        </div>
        <p className="text-muted-foreground">Manage your host account.</p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{user.email}</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Deleting your account permanently removes it and every room you own. This can't be
              undone.
            </p>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <UserX className="size-4 mr-1" /> Delete account
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer variant="minimal" />

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={async () => {
          await qc.cancelQueries();
          qc.clear();
          await supabase.auth.signOut();
          navigate({ to: "/", replace: true });
        }}
      />
    </div>
  );
}
