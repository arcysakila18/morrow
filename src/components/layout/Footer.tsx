import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SITE } from "@/config/site";

export function Footer() {
  const cols = [
    { title: "Product", links: [{ label: "Swap", href: "/" }, { label: "Explore", href: "/explore" }, { label: "Pools", href: "/pools" }, { label: "Docs", href: "/docs" }] },
    { title: "Network", links: [{ label: "Robinhood Chain explorer", href: SITE.links.explorer, ext: true }, { label: "Robinhood Chain docs", href: SITE.links.chainDocs, ext: true }] },
    { title: "Community", links: [{ label: "X / Twitter", href: SITE.links.x, ext: true }, { label: "Discord", href: SITE.links.discord, ext: true }] },
    { title: "Legal", links: [{ label: "Terms", href: "/terms" }, { label: "Privacy", href: "/privacy" }] },
  ];
  return (
    <footer className="mt-24 bg-ink pb-28 text-paper md:pb-0">
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo inverted />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/55">{SITE.tagline}</p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-paper/40">{c.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {"ext" in l && l.ext ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="text-sm text-paper/75 transition hover:text-lime">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-paper/75 transition hover:text-lime">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-paper/10 pt-6 text-xs leading-relaxed text-paper/45">
          <p className="max-w-3xl">{SITE.disclaimer} Trading digital assets involves risk, including loss of principal. Nothing on this site is investment advice.</p>
          <p className="mt-3">© {new Date().getFullYear()} MORROW</p>
        </div>
      </div>
    </footer>
  );
}
