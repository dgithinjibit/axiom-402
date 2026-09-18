import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/",           label: "Docs"        },
  { href: "/playground", label: "Playground"  },
  { href: "/visualize",  label: "Visualizer"  },
  { href: "/verify",     label: "Verify"      },
] as const;

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/" className="mr-8 flex items-center gap-2 font-bold">
          <span className="rounded-md bg-axiom-600 px-2 py-0.5 text-sm text-white">
            axiom
          </span>
          <span className="text-foreground">402</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right-side badge */}
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="hidden sm:inline">NEAR Testnet</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 animate-pulse-slow rounded-full bg-green-500" aria-hidden="true" />
            <span className="sr-only">Live</span>
          </span>
        </div>
      </div>
    </header>
  );
}
