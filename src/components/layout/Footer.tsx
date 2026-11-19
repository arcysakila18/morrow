import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SITE } from "@/config/site";
import { ContractAddress } from "@/components/home/ContractAddress";

type L = { label: string; href: string; ext?: boolean };

export function Footer() {
  const cols: { title: string; links: L[] }[] = [
    { title: "Products", links: [{ label: "Swap", href: "/" }, { label: "Explore", href: "/explore" }, { label: "Cross-network swap", href: "/bridge" }, { label: "Pools", href: "/pools" }, { label: "Portfolio", href: "/portfolio" }] },
    { title: "Learn", links: [{ label: "Docs", href: "/docs" }, { label: "Chain explorer", href: SITE.links.explorer, ext: true }, { label: "Robinhood Chain docs", href: SITE.links.chainDocs, ext: true }] },
    { title: "Community", links: [{ label: "X (Twitter)", href: SITE.links.x, ext: true }, { label: "Discord", href: SITE.links.discord, ext: true }].filter((l) => l.href) },
    { title: "Legal", links: [{ label: "Terms", href: "/terms" }, { label: "Privacy", href: "/privacy" }] },
  ];
  const linkCls = "text-[17px] text-muted transition hover:text-lime";
  return (
    <footer className="mt-28 pb-28 md:pb-0">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="border-t border-line pt-14">
          <div className="grid gap-12 md:grid-cols-[1.3fr_2fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted">{SITE.tagline}</p>
              <ContractAddress className="mt-5" />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-4">
              {cols.map((c) => (
                <div key={c.title}>
                  <h3 className="text-[17px] font-semibold text-ink">{c.title}</h3>
                  <ul className="mt-5 space-y-4">
                    {c.links.map((l) => (
                      <li key={l.label}>
                        {l.ext ? (
                          <a href={l.href} target="_blank" rel="noreferrer" className={linkCls}>{l.label}</a>
                        ) : (
                          <Link href={l.href} className={linkCls}>{l.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-14 border-t border-line py-8 text-[13px] leading-relaxed text-faint">
            <p className="max-w-3xl">{SITE.disclaimer} Trading digital assets involves risk, including loss of principal. Nothing on this site is investment advice.</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px]">
              <span className="text-ink">© {new Date().getFullYear()} Morrow</span>
              <Link href="/terms" className="hover:text-ink">Terms</Link>
              <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
