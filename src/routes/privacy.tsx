import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { CONTROLLER } from "@/lib/legal-controller";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Feedblick Pomodoro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

// Adapted from feedblick-edu's own privacy policy — same drafting-in-good-faith disclaimer, same
// GDPR rights list and Vercel/Supabase sub-processor detail, but rewritten around this app's own
// (smaller) data model: no video embeds, no donation link, no self-serve signup (accounts are
// invite-only via an approved access request), and no anonymous-response table at all — a
// participant's name/group/signal never reaches Postgres, only a live Realtime channel that's
// discarded once the room ends.
function PrivacyPage() {
  const STORAGE_ITEMS: Array<[string, string]> = [
    ["feedblick-theme", "Light/dark theme preference"],
    ["feedblick-pomodoro-name-<room code>", "Your typed name, remembered per room you've joined"],
    ["sb-*-auth-token", "Login session token (signed-in hosts only)"],
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80">
            <BrandMark />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Privacy policy</h1>
          <p className="text-sm text-muted-foreground mt-1">Last updated: August 2026</p>
          <p className="text-sm text-muted-foreground">
            This privacy policy applies to the Feedblick Pomodoro web application.
          </p>
        </div>

        <p className="text-sm text-muted-foreground border-l-2 pl-4">
          This privacy policy describes what data Feedblick Pomodoro processes and how, drafted in
          good faith based on the features currently in use. It is not a substitute for legal review
          — please have it checked by a lawyer or data protection officer before relying on it.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Controller</h2>
          <p className="text-sm text-muted-foreground">
            The controller within the meaning of the GDPR is:
          </p>
          <dl className="text-sm space-y-1">
            <div>
              <dt className="inline text-muted-foreground">Name: </dt>
              <dd className="inline">{CONTROLLER.name ?? "[full name — to be added]"}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Address: </dt>
              <dd className="inline">
                {CONTROLLER.street && CONTROLLER.cityLine
                  ? `${CONTROLLER.street}, ${CONTROLLER.cityLine}`
                  : "[street and house number, postal code and city — to be added]"}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Email: </dt>
              <dd className="inline">{CONTROLLER.email ?? "[email address — to be added]"}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            Full details (incl. tax number / VAT ID) are on the{" "}
            <Link to="/impressum" className="hover:underline">
              Impressum
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Hosting and server logs</h2>
          <p className="text-sm text-muted-foreground">
            Feedblick Pomodoro uses Supabase for its database, authentication, and realtime updates,
            and Vercel Inc. to host and serve the web application itself. Visiting the site
            automatically causes technical information (e.g. IP address, time of access, browser
            used, and request metadata in server logs) to be processed by these providers'
            infrastructure. This is technically necessary to deliver the website and ensure server
            stability (Art. 6(1)(f) GDPR). Vercel's Frankfurt region (eu-central-1) is used for
            hosting, and Supabase's EU region (AWS eu-central-1, Frankfurt) for the database, so
            this data stays within the EU — see the Sub-processors section below.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Your rights</h2>
          <p className="text-sm text-muted-foreground">Under the GDPR, you have the right to:</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Access the personal data we hold about you (Art. 15)</li>
            <li>Have inaccurate data corrected (Art. 16)</li>
            <li>Have your data deleted (Art. 17)</li>
            <li>Request restriction of processing (Art. 18)</li>
            <li>Receive your data in a portable format (Art. 20)</li>
            <li>Object to processing (Art. 21)</li>
            <li>Lodge a complaint with a supervisory authority (Art. 77)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Requesting access</h2>
          <p className="text-sm text-muted-foreground">
            Before you have an account, submitting the "Request access" form stores the name, email
            address, and team name you provide, so we can review and respond to your request (Art.
            6(1)(b) GDPR, a pre-contractual measure). If approved, this becomes the basis for your
            account invite; if not, you may ask us to delete the record.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Host accounts</h2>
          <p className="text-sm text-muted-foreground">
            A host account is created once an access request is approved — we send an invite email
            with a link to set your password. This stores your email address and an encrypted
            password (Art. 6(1)(b) GDPR, to perform the contract of use).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Participants joining a room</h2>
          <p className="text-sm text-muted-foreground">
            Anyone joining a room via a join code doesn't need an account and never signs in. The
            name they type, their chosen group, and their Done/Stuck/Need-2-min signal are never
            written to our database at all — they exist only in a live, temporary realtime channel
            for the duration of the room, and are discarded the moment that channel closes (the host
            ending the room, or everyone disconnecting). It's each participant's own responsibility
            not to type personal data into the name field beyond what they're comfortable sharing
            with the room.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Local storage (no tracking)</h2>
          <p className="text-sm text-muted-foreground">
            The following is stored only in your browser, not on our servers (except the session
            token, needed for authentication):
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {STORAGE_ITEMS.map(([key, desc]) => (
              <li key={key}>
                <span className="font-mono text-xs">{key}</span> — {desc}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            None of this is used for tracking or behavioral analysis. In our assessment, this
            storage is technically necessary to provide a feature the user explicitly requested and
            is therefore exempt from consent under §25(2) TTDSG — please have this assessment
            checked if in doubt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Sub-processors</h2>
          <p className="text-sm text-muted-foreground">
            We use the following service providers as processors: Supabase, Inc. (hosting, database,
            authentication, realtime) and Vercel Inc. (hosting and serving the web application
            itself). A data processing agreement under Art. 28 GDPR is in place (or being put in
            place) with Supabase.
          </p>
          <div className="text-sm space-y-1">
            <dt className="inline text-muted-foreground">Vercel — service: </dt>
            <dd className="inline">
              Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, USA
            </dd>
            <br />
            <dt className="inline text-muted-foreground">Purpose: </dt>
            <dd className="inline">Hosting and serving the web application</dd>
            <br />
            <dt className="inline text-muted-foreground">Safeguard: </dt>
            <dd className="inline">
              Vercel's Frankfurt region (eu-central-1) is used — data stays in the EU. No Vercel
              Analytics is enabled.
            </dd>
          </div>
          <div className="text-sm space-y-1 pt-3">
            <dt className="inline text-muted-foreground">Supabase — service: </dt>
            <dd className="inline">
              Supabase Inc., 970 Toa Payoh North, #07-04, Singapore 318992 (EU data stored on AWS
              eu-central-1, Frankfurt)
            </dd>
            <br />
            <dt className="inline text-muted-foreground">Purpose: </dt>
            <dd className="inline">Database, authentication, and realtime infrastructure</dd>
            <br />
            <dt className="inline text-muted-foreground">Data processed: </dt>
            <dd className="inline">
              Host account data, room/task content, access requests — no participant data (see
              above)
            </dd>
            <br />
            <dt className="inline text-muted-foreground">Safeguard: </dt>
            <dd className="inline">
              Data is stored in AWS eu-central-1 (Frankfurt, EU). Supabase is SOC 2 Type II
              certified and offers a DPA.
            </dd>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Retention</h2>
          <p className="text-sm text-muted-foreground">
            Personal data is deleted once the purpose of processing no longer applies, or on
            request, unless a legal retention obligation applies. Hosts can delete their account and
            every room they own at any time via Account → Delete account, or request deletion by
            email.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Contact for privacy questions</h2>
          <p className="text-sm text-muted-foreground">
            For any privacy questions, please contact: {CONTROLLER.email ?? "[email address]"}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Changes to this policy</h2>
          <p className="text-sm text-muted-foreground">
            This privacy policy is updated as needed, e.g. for new features or changes in the law.
            The version currently published on this page always applies.
          </p>
        </section>

        <Footer variant="legal" />
      </main>
    </div>
  );
}
