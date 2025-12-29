import { Sprout, LineChart, ShieldCheck } from "lucide-react";
import { SectionCard } from "@/layout/section-card";

const quickLinks = [
  {
    title: "Unified Dashboard",
    description:
      "Monitor climate risk, soil insights, and operational KPIs from a single responsive workspace.",
    href: "/dashboard",
    icon: <LineChart className="h-5 w-5" />,
  },
  {
    title: "Farm Operations",
    description:
      "Plan crop rotations, dispatch tasks, and collaborate with extension officers in real time.",
    href: "/farms",
    icon: <Sprout className="h-5 w-5" />,
  },
  {
    title: "Secure Access",
    description:
      "Role-aware authentication keeps agronomists, buyers, and admins inside their guardrails.",
    href: "/(auth)",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-16 md:px-8">
      <section className="glass-panel relative overflow-hidden px-8 py-12">
        <div className="mx-auto max-w-3xl text-center md:text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">
            Agriconnect platform
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Data-driven decisions for every field, farmer, and marketplace deal.
          </h1>
          <p className="mt-6 text-base text-foreground/70">
            Connect your operations to the AgriConnect backend APIs to orchestrate traceable production, inventory,
            and analytics — all within a composable Next.js experience.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg transition hover:brightness-110"
            >
              Launch dashboard
            </a>
            <a
              href="/docs"
              className="inline-flex items-center justify-center rounded-full border border-foreground/20 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-foreground/40"
            >
              API reference
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {quickLinks.map((link) => (
          <SectionCard key={link.title} {...link} />
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="glass-panel p-6">
          <h2 className="text-2xl font-semibold">Frontend architecture</h2>
          <p className="mt-3 text-sm text-foreground/70">
            React Query orchestrates every HTTP call through the shared axios client, while React Hook Form + Zod keep
            inputs type-safe. Zustand powers lightweight global state for theme toggles, filters, and workspace context.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground/80">
            <li>Radix UI primitives form the dialog, dropdown, and select experiences.</li>
            <li>Recharts renders agronomic KPIs with accessible SVG charts.</li>
            <li>Tailwind + class-variance-authority standardize component tokens.</li>
          </ul>
        </article>

        <article className="glass-panel p-6">
          <h2 className="text-2xl font-semibold">Next steps</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-foreground/80">
            <li>Implement authenticated routes inside <code>/app/(auth)</code>.</li>
            <li>Wire <code>lib/api</code> clients to the Django backend and hydrate React Query caches.</li>
            <li>Style shared UI primitives inside <code>components/ui</code> before building feature flows.</li>
          </ol>
        </article>
      </section>
    </main>
  );
}
