/**
 * Calm ambient background: two soft lime/green glows and a faint dot grid that fades out.
 * Fixed behind all content, no animation, ignores pointer events.
 */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      <div
        className="absolute -top-[22%] left-1/2 h-[720px] w-[1100px] -translate-x-1/2 rounded-full opacity-80"
        style={{ background: "radial-gradient(closest-side, rgba(217,243,106,0.5), rgba(217,243,106,0.22) 40%, rgba(217,243,106,0.06) 65%, rgba(217,243,106,0) 100%)" }}
      />
      <div
        className="absolute -right-[12%] top-[38%] h-[560px] w-[620px] rounded-full opacity-70"
        style={{ background: "radial-gradient(closest-side, rgba(120,190,70,0.18), rgba(120,190,70,0.07) 50%, rgba(120,190,70,0) 100%)" }}
      />
      <div
        className="absolute -left-[14%] top-[62%] h-[480px] w-[560px] rounded-full opacity-70"
        style={{ background: "radial-gradient(closest-side, rgba(217,243,106,0.26), rgba(217,243,106,0.09) 50%, rgba(217,243,106,0) 100%)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(16,17,20,0.09) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 18%, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 18%, #000 30%, transparent 75%)",
        }}
      />
      {/* Fine paper grain: softens gradient banding and keeps the surface from feeling flat. */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
