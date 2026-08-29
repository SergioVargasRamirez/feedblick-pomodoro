import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Timer, QrCode, ListChecks, Users } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { BackgroundGlow } from "@/components/BackgroundGlow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Feedblick Pomodoro · A shared pomodoro timer for teams" },
      {
        name: "description",
        content:
          "A shared pomodoro timer, task list, and anonymous signals for teams working together in a room.",
      },
      { property: "og:title", content: "Feedblick Pomodoro · A shared pomodoro timer for teams" },
      {
        property: "og:description",
        content: "One shared timer, one shared task list, everyone's status without the noise.",
      },
    ],
  }),
  component: Home,
});

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
                Host sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20">
        <section className="text-center max-w-2xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight">Pomodoro, for teams</h1>
          <p className="mt-6 text-lg text-muted-foreground">
            One shared timer, one shared task list, and everyone's status — Done, Stuck, or Need 2
            min — without a single stand-up. Open a room, share a QR code, and go.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link to="/auth" search={{ tab: "request" }}>
              <Button size="lg">Request access</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Host sign in
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-6 mt-24">
          <Feature
            icon={<Timer className="size-5" />}
            title="One shared timer"
            text="A server-authoritative pomodoro timer everyone in the room sees the same way, with adjustable focus and break lengths and automatic phase changes."
          />
          <Feature
            icon={<QrCode className="size-5" />}
            title="Join with a QR code"
            text="No accounts, no app to install. Scan a code or open a link, type a name, and you're in the room."
          />
          <Feature
            icon={<ListChecks className="size-5" />}
            title="A shared task list"
            text="The host keeps one editable list everyone can see and check off at their own pace, on their own device."
          />
          <Feature
            icon={<Users className="size-5" />}
            title="Anonymous group signals"
            text="Done, Stuck, or Need 2 min — aggregated for the whole room, never pinned to one person, so status is honest."
          />
        </section>
      </main>
      <Footer variant="home" />
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border p-6">
      <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
