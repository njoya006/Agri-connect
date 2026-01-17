import Link from "next/link";
import { Github, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-white/80 px-4 py-6 text-sm text-foreground/70 backdrop-blur lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="font-medium text-foreground/80">© {year} AgriConnect. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/docs" className="transition hover:text-foreground">
            API Docs
          </Link>
          <Link href="/support" className="transition hover:text-foreground">
            Support
          </Link>
          <Link href="/status" className="transition hover:text-foreground">
            System Status
          </Link>
        </div>
        <div className="flex items-center gap-3 text-foreground/80">
          <Link href="https://twitter.com" aria-label="Twitter" className="transition hover:text-foreground" target="_blank" rel="noreferrer">
            <Twitter className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="https://linkedin.com" aria-label="LinkedIn" className="transition hover:text-foreground" target="_blank" rel="noreferrer">
            <Linkedin className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="https://github.com" aria-label="GitHub" className="transition hover:text-foreground" target="_blank" rel="noreferrer">
            <Github className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </footer>
  );
}
