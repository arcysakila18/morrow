import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/cn";

/** Consistent section heading: eyebrow pill, title, optional lead. */
export function SectionHeader({ eyebrow, title, lead, center }: { eyebrow: string; title: ReactNode; lead?: ReactNode; center?: boolean }) {
  return (
    <div className={cn(center && "text-center")}>
      <Reveal>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[13px] font-medium text-muted backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          {eyebrow}
        </span>
      </Reveal>
      <Reveal delay={80}>
        <h2 className={cn("mt-5 text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[56px]", center ? "mx-auto max-w-[18ch]" : "max-w-[18ch]")}>{title}</h2>
      </Reveal>
      {lead && (
        <Reveal delay={160}>
          <p className={cn("mt-5 max-w-xl text-[17px] leading-relaxed text-muted sm:text-[19px]", center && "mx-auto")}>{lead}</p>
        </Reveal>
      )}
    </div>
  );
}
