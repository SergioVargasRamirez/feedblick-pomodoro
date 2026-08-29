import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer";
import { MailCheck } from "lucide-react";

export const Route = createFileRoute("/request-submitted")({
  head: () => ({
    meta: [
      { title: "Request received · Feedblick Pomodoro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestSubmittedPage,
  ssr: false,
});

function RequestSubmittedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Toaster />
      <div className="w-full max-w-md space-y-2">
        <Card>
          <CardHeader className="items-center text-center">
            <MailCheck className="size-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Request received</CardTitle>
            <CardDescription>Thanks — we'll take a look and get back to you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Once approved, we'll email you a link to set your password and sign in.
            </p>
            <p className="text-xs text-muted-foreground pt-2">
              <Link to="/auth" className="hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
        <Footer variant="minimal" />
      </div>
    </div>
  );
}
