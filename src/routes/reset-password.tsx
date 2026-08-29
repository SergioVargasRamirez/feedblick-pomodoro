import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password · Feedblick Pomodoro" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    // A dead recovery link (already used, or expired) never fires PASSWORD_RECOVERY: GoTrue
    // instead appends `#error=...&error_description=...` to this same redirect. Without
    // checking for it, the page just sits on the "waiting" copy forever with permanently
    // disabled fields, indistinguishable from a page that's still loading.
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const description = params.get("error_description") || params.get("error");
    if (description) setLinkError(description);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative isolate min-h-screen flex items-center justify-center bg-background px-4">
      <BackgroundGlow />
      <Toaster />
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reset password</CardTitle>
            <CardDescription>
              {linkError
                ? "This reset link is no longer valid."
                : ready
                  ? "Choose a new password."
                  : "Waiting for the reset link to be verified…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linkError ? (
              <p className="text-sm text-muted-foreground">
                Request a new reset link from the sign-in page.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={!ready}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    disabled={!ready}
                  />
                </div>
                <Button type="submit" disabled={loading || !ready} className="w-full">
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            )}
            <p className="text-xs text-muted-foreground mt-6 text-center">
              <Link to="/auth" className="hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
