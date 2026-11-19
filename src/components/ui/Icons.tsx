import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: 20,
  height: 20,
  "aria-hidden": true,
  ...p,
});

export const IconChevronDown = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>);
export const IconArrowDown = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 5v14M6 13l6 6 6-6" /></svg>);
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>);
export const IconExternal = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" /></svg>);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const IconAlert = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 8v5M12 16.5v.01" /><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>);
export const IconCopy = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></svg>);
export const IconMenu = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M4 8h16M4 16h16" /></svg>);
export const IconRoute = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" /></svg>);
export const IconGas = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M4 20V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14M3 20h12M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3" /><path d="M7 8h4" /></svg>);
export const IconInfo = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></svg>);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const IconWallet = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M4 7a2 2 0 0 1 2-2h11v4" /><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M16 13h.01" /></svg>);
export const IconRefresh = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></svg>);

export const IconSwapNav = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M7 4 4 7l3 3M4 7h12a4 4 0 0 1 4 4M17 20l3-3-3-3M20 17H8a4 4 0 0 1-4-4" /></svg>);
export const IconCompass = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></svg>);
export const IconDrop = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 3.5s-6 6.2-6 10.5a6 6 0 0 0 12 0c0-4.3-6-10.5-6-10.5Z" /><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" /></svg>);
export const IconPie = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 3v9h9" /><path d="M20.5 15A9 9 0 1 1 9 3.5" /></svg>);
export const IconBook = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Z" /><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19M9 7h6" /></svg>);
export const IconBridge = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 17h18M5 17v-3a7 7 0 0 1 14 0v3M9 17v-2.5M15 17v-2.5M12 17v-3" /></svg>);
export const IconShuffle = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>);
export const IconTrend = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m3 17 6-6 4 4 8-8M15 7h6v6" /></svg>);
export const IconStar = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>);
