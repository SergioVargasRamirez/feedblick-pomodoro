import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

type Search = { email?: string };

export const Route = createFileRoute("/check-email")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Check your email · Feedblick Pomodoro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckEmailPage,
  ssr: false,
});

function CheckEmailPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const [resending, setResending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const onResend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) return toast.error(error.message);
    toast.success("Confirmation email resent.");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <BackgroundGlow center />
      <Toaster />
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <Card>
          <CardHeader className="items-center text-center">
            <MailCheck className="size-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              {email
                ? `We sent a confirmation link to ${email}.`
                : "Check your inbox for a confirmation link."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onResend}
              disabled={resending || !email}
            >
              {resending ? "Resending…" : "Resend email"}
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
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
