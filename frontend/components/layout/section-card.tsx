import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description: string;
  href: string;
  actionLabel?: string;
  icon?: ReactNode;
}

export function SectionCard({
  title,
  description,
  href,
  actionLabel = "Open",
  icon,
}: SectionCardProps) {
  return (
    <article className="glass-panel flex flex-col gap-4 p-6 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center gap-3">
        {icon && <span className="text-accent">{icon}</span>}
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-foreground/70">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-medium text-accent"
      >
        {actionLabel}
        <ArrowRight size={16} aria-hidden />
      </Link>
    </article>
  );
}
