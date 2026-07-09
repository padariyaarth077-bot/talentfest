import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Music, Mic2, Music2, Palette, PenTool, Drama } from "lucide-react";

type Deco = {
  Icon: typeof Music;
  label: string;
  anim: string;
  dur: string;
  delay: string;
  opacity: number;
  blur: number;
  size: number;
  pos: CSSProperties;
  depth: number; // parallax strength
  glow?: string;
};

const decos: Deco[] = [
  // Dance — top left
  { Icon: Music, label: "Dance", anim: "hero-float-0", dur: "48s", delay: "0s", opacity: 0.16, blur: 3, size: 120, pos: { top: "8%", left: "5%" }, depth: 22, glow: "rgba(212,175,55,0.35)" },
  // Music — top right
  { Icon: Music2, label: "Music", anim: "hero-float-1", dur: "56s", delay: "-6s", opacity: 0.14, blur: 3, size: 100, pos: { top: "12%", right: "7%" }, depth: 30 },
  // Singing — mid left
  { Icon: Mic2, label: "Singing", anim: "hero-float-2", dur: "52s", delay: "-14s", opacity: 0.12, blur: 4, size: 90, pos: { top: "44%", left: "3%" }, depth: 18, glow: "rgba(184,115,51,0.35)" },
  // Painting — mid right
  { Icon: Palette, label: "Painting", anim: "hero-float-0", dur: "58s", delay: "-22s", opacity: 0.15, blur: 3, size: 110, pos: { top: "40%", right: "4%" }, depth: 26 },
  // Creative Writing — bottom left
  { Icon: PenTool, label: "Creative Writing", anim: "hero-float-1", dur: "50s", delay: "-30s", opacity: 0.12, blur: 4, size: 88, pos: { bottom: "10%", left: "9%" }, depth: 34, glow: "rgba(244,196,48,0.3)" },
  // Acting — bottom right
  { Icon: Drama, label: "Acting", anim: "hero-float-2", dur: "54s", delay: "-40s", opacity: 0.18, blur: 3, size: 118, pos: { bottom: "8%", right: "10%" }, depth: 20 },
];

export function HeroBackground() {
  const [parallax, setParallax] = useState(false);
  const posRef = useRef({ x: 0, y: 0 });
  const [, force] = useState(0);

  useEffect(() => {
    const mqDesktop = window.matchMedia("(pointer: fine) and (min-width: 768px)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const enabled = mqDesktop.matches && !mqReduce.matches;
    setParallax(enabled);
    if (!enabled) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        posRef.current = { x, y };
        force((n) => n + 1);
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const { x, y } = posRef.current;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
      {decos.map((d) => {
        const px = parallax ? x * d.depth : 0;
        const py = parallax ? y * d.depth : 0;
        return (
          <div
            key={d.label}
            className="absolute"
            style={{
              ...d.pos,
              transform: `translate3d(${px}px, ${py}px, 0)`,
              transition: parallax ? "transform 0.4s ease-out" : undefined,
            }}
          >
            {d.glow && (
              <div
                className="absolute inset-0 rounded-full blur-3xl"
                style={{
                  background: `radial-gradient(circle, ${d.glow} 0%, transparent 70%)`,
                  transform: "scale(2.2)",
                }}
              />
            )}
            <div
              className="hero-icon relative text-primary"
              style={
                {
                  "--hero-anim": d.anim,
                  "--hero-dur": d.dur,
                  "--hero-delay": d.delay,
                  "--hero-icon-opacity": d.opacity,
                  filter: `blur(${d.blur}px) drop-shadow(0 8px 24px rgba(0,0,0,0.15))`,
                } as CSSProperties
              }
            >
              <d.Icon strokeWidth={1.25} style={{ width: d.size, height: d.size }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
