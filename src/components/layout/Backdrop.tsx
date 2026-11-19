/**
 * Calm dark ambient background: a soft lime glow behind the hero, a faint dot grid and fine grain.
 * Fixed behind all content, no animation, ignores pointer events.
 */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      <div
        className="anim-drift absolute -top-[30%] left-1/2 h-[760px] w-[1200px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(217,243,106,0.16), rgba(217,243,106,0.06) 45%, rgba(217,243,106,0) 100%)" }}
      />
      <div
        className="anim-drift-2 absolute -right-[18%] top-[45%] h-[600px] w-[700px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(95,214,168,0.08), rgba(95,214,168,0) 100%)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 70% 50% at 50% 12%, #000 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 12%, #000 25%, transparent 75%)",
        }}
      />
      {/* Fine grain: softens gradient banding. */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
