"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkSelector } from "@/components/wallet/NetworkSelector";
import { IconBook, IconCompass, IconDrop, IconPie, IconSwapNav } from "@/components/ui/Icons";

export const NAV = [
  { href: "/", label: "Swap", Icon: IconSwapNav },
  { href: "/explore", label: "Explore", Icon: IconCompass },
  { href: "/pools", label: "Pools", Icon: IconDrop },
  { href: "/portfolio", label: "Portfolio", Icon: IconPie },
  { href: "/docs", label: "Docs", Icon: IconBook },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function Nav() {
  const path = usePathname() ?? "/";
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/60 bg-paper/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="MORROW home">
            <span className="hidden sm:block"><Logo /></span>
            <span className="block sm:hidden"><LogoMark /></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition",
                  isActive(path, n.href) ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <NetworkSelector />
            <ConnectButton />
          </div>
        </div>
      </header>
      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 px-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-ink" : "text-faint")}
              >
                <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition-colors", active ? "bg-lime" : "bg-transparent")}>
                  <Icon width={20} height={20} strokeWidth={active ? 2.1 : 1.8} />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
