import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Feedblick Pomodoro" }],
  }),
  component: Home,
});

// Placeholder landing page — the room/timer/task/signal UI is built next. This only has to
// establish the app shell and the teacher sign-in entry point.
function Home() {
  return (
    <div className="relative isolate min-h-screen bg-background">
      <BackgroundGlow />
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Teacher sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Feedblick Pomodoro</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A shared pomodoro timer, task list, and anonymous group signals for students working in
          groups.
        </p>
      </main>
    </div>
  );
}
