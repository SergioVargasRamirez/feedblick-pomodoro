import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard · Feedblick Pomodoro" }],
  }),
  component: Dashboard,
});

// Placeholder teacher landing page — room creation, timer control, task editor, and group
// badges land here next.
function Dashboard() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold">Feedblick Pomodoro</span>
          <Button variant="outline" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-20 text-center text-muted-foreground">
        <p>Signed in as {user.email}.</p>
        <p className="mt-2">Room creation is next.</p>
      </main>
    </div>
  );
}
