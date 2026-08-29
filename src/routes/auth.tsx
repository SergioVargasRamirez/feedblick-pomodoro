import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { tab?: "signin" | "request" } => ({
    tab: s.tab === "request" ? "request" : undefined,
  }),
  head: () => ({
    meta: [{ title: "Sign in · Feedblick Pomodoro" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent.");
    setResetMode(false);
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
            <CardTitle className="text-2xl">Host sign in</CardTitle>
            <CardDescription>Sign in to open a room for your team.</CardDescription>
          </CardHeader>
          <CardContent>
            {resetMode ? (
              <form onSubmit={onReset} className="space-y-4 pt-2" suppressHydrationWarning>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send you a reset link.
                </p>
                <Field label="Email" type="email" value={email} onChange={setEmail} />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="text-xs text-muted-foreground hover:underline w-full text-center"
                >
                  Back
                </button>
              </form>
            ) : (
              <Tabs defaultValue={tab === "request" ? "request" : "signin"}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="request">Request access</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={onSignIn} className="space-y-4 pt-4" suppressHydrationWarning>
                    <Field label="Email" type="email" value={email} onChange={setEmail} />
                    <Field
                      label="Password"
                      type="password"
                      value={password}
                      onChange={setPassword}
                    />
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Signing in…" : "Sign in"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setResetMode(true)}
                      className="text-xs text-muted-foreground hover:underline w-full text-center"
                    >
                      Forgot password?
                    </button>
                  </form>
                </TabsContent>
                <TabsContent value="request">
                  <RequestAccessForm />
                </TabsContent>
              </Tabs>
            )}
            <p className="text-xs text-muted-foreground mt-6 text-center">
              <Link to="/" className="hover:underline">
                Back home
              </Link>
            </p>
          </CardContent>
        </Card>
        <Footer variant="minimal" />
      </div>
    </div>
  );
}

function RequestAccessForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("access_requests").insert({
      name,
      email,
      team_name: teamName,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/request-submitted" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4" suppressHydrationWarning>
      <p className="text-sm text-muted-foreground">
        Tell us a bit about your team and we'll set up your host account.
      </p>
      <Field label="Your name" type="text" value={name} onChange={setName} />
      <Field label="Team name" type="text" value={teamName} onChange={setTeamName} />
      <Field label="Email" type="email" value={email} onChange={setEmail} />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Submitting…" : "Request access"}
      </Button>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={type === "password" ? 6 : undefined}
        suppressHydrationWarning
      />
    </div>
  );
}
