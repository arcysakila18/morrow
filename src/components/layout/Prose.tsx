import type { ReactNode } from "react";

export function Prose({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[760px] px-4 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-[32px] font-semibold tracking-[-0.025em]">{title}</h1>
      {lead && <p className="mt-2 text-[15px] leading-relaxed text-muted">{lead}</p>}
      <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-ink/85 [&_h2]:mb-3 [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:space-y-1.5 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]">
        {children}
      </div>
    </div>
  );
}
