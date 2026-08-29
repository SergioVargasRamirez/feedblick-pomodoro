import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { CONTROLLER } from "@/lib/legal-controller";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [{ title: "Impressum · Feedblick Pomodoro" }, { name: "robots", content: "noindex" }],
  }),
  component: ImpressumPage,
});

function ImpressumPage() {
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
          <h1 className="text-3xl font-bold">Legal notice (Impressum)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Information according to §5 of the German Digital Services Act (DDG, formerly §5 TMG)
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Operator</h2>
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
            <div>
              <dt className="inline text-muted-foreground">Tax number: </dt>
              <dd className="inline">{CONTROLLER.taxId}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">
                VAT identification number (§ 27a UStG):{" "}
              </dt>
              <dd className="inline">{CONTROLLER.vatId}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">
                Business identification number (Wirtschafts-ID):{" "}
              </dt>
              <dd className="inline">{CONTROLLER.wirtschaftsId}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Responsible for content</h2>
          <p className="text-sm text-muted-foreground">
            Responsible for content per §18(2) of the German Interstate Media Treaty (MStV): the
            person named above.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Liability for content</h2>
          <p className="text-sm text-muted-foreground">
            As a service provider, we are responsible for our own content on these pages under
            general law, per §7(1) DDG. Under §§8–10 DDG, however, we are not obligated to monitor
            transmitted or stored third-party information or to investigate circumstances indicating
            unlawful activity. Obligations to remove or block the use of information under general
            law remain unaffected; liability in this respect is only possible from the point in time
            at which we become aware of a specific infringement. Upon becoming aware of any such
            infringement, we will remove the relevant content immediately.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Liability for links</h2>
          <p className="text-sm text-muted-foreground">
            Our site may contain links to external third-party websites over whose content we have
            no influence. We therefore cannot assume any liability for this external content; the
            respective provider or operator of the linked page is always responsible for it. The
            linked pages were checked for possible legal violations at the time of linking; no
            unlawful content was identifiable at that time. Permanent monitoring of linked pages'
            content is not reasonable without concrete evidence of an infringement. Upon becoming
            aware of any legal violations, we will remove such links immediately.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Copyright</h2>
          <p className="text-sm text-muted-foreground">
            Content and works created by the operator of this site are subject to German copyright
            law. Reproduction, editing, distribution, or any use outside the limits of copyright law
            requires the prior written consent of the respective author or creator.
          </p>
        </section>

        <Footer variant="legal" />
      </main>
    </div>
  );
}
