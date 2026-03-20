"use client";

import { useRouter } from "next/navigation";
import { useRef, useEffect, useState } from "react";

const T = {
  bg:     "#1e1714",
  bgCard: "#2a1f1b",
  border: "#4a3a35",
  gold:   "#de9e48",
  goldHov:"#e8ae5a",
  text:   "#ffffff",
  textMut:"#bfbfbf",
  font:   `"Satoshi", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
};

function GradientBg() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "55%", height: "60%", background: "radial-gradient(ellipse at center, rgba(122,67,29,0.28) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: "55%", height: "55%", background: "radial-gradient(ellipse at center, rgba(222,158,72,0.15) 0%, transparent 70%)", filter: "blur(80px)" }} />
      <div style={{ position: "absolute", top: "40%", left: "40%", width: "40%", height: "40%", background: "radial-gradient(ellipse at center, rgba(90,40,20,0.2) 0%, transparent 70%)", filter: "blur(60px)" }} />
    </div>
  );
}

function GlowCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function handleMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width) * 100 + "%");
      el.style.setProperty("--my", ((e.clientY - rect.top) / rect.height) * 100 + "%");
      el.style.setProperty("--glow-opacity", "1");
    }
    function handleLeave() { if (el) el.style.setProperty("--glow-opacity", "0"); }
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => { el.removeEventListener("mousemove", handleMove); el.removeEventListener("mouseleave", handleLeave); };
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", "--mx": "50%", "--my": "50%", "--glow-opacity": "0", ...style } as React.CSSProperties}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at var(--mx) var(--my), rgba(222,158,72,0.12) 0%, transparent 60%)", opacity: "var(--glow-opacity)" as any, transition: "opacity 0.3s ease", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 14, boxShadow: "inset 0 0 0 1px rgba(222,158,72,0.3)", opacity: "var(--glow-opacity)" as any, transition: "opacity 0.3s ease", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function StepCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <GlowCard style={{ padding: "14px 14px 10px", position: "relative", overflow: "hidden", height: "100%" }}>
      <span style={{ position: "absolute", bottom: -8, right: 6, fontSize: 48, fontWeight: 900, color: T.border, fontFamily: T.font, lineHeight: 1, userSelect: "none" as const, pointerEvents: "none" as const, opacity: 0.2, zIndex: 0 }}>{num}</span>
      <p style={{ fontSize: 12, fontWeight: 700, color: T.gold, fontFamily: T.font, margin: "0 0 4px", position: "relative", zIndex: 1 }}>{num}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font, margin: "0 0 4px", position: "relative", zIndex: 1 }}>{title}</p>
      <p style={{ fontSize: 11, color: T.textMut, fontFamily: T.font, margin: 0, lineHeight: 1.4, position: "relative", zIndex: 1 }}>{desc}</p>
    </GlowCard>
  );
}

function Arrow() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 24 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 8h12M9 4l4 4-4 4" stroke={T.border} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function MascotImage({ size }: { size: number }) {
  const [imgError, setImgError] = useState(false);
  const [extIdx, setExtIdx] = useState(0);
  const extensions = ["png", "jpg", "jpeg"];
  function handleError() {
    if (extIdx < extensions.length - 1) setExtIdx((i) => i + 1);
    else setImgError(true);
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: "2px solid rgba(222,158,72,0.3)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#2a1f1b" }}>
      {imgError
        ? <span style={{ fontSize: size * 0.3, fontWeight: 900, color: T.gold, fontFamily: T.font }}>TM</span>
        : <img src={"/" + "mascot." + extensions[extIdx]} alt="ToolMonkey mascot" onError={handleError} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      }
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font, position: "relative", overflow: "hidden" }}>
      <GradientBg />
      <style>{`
        @keyframes mascotGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(222,158,72,0.2), 0 0 40px rgba(222,158,72,0.08); }
          50% { box-shadow: 0 0 40px rgba(222,158,72,0.4), 0 0 80px rgba(222,158,72,0.15); }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ height: 48, display: "flex", alignItems: "center", padding: "0 24px", borderBottom: `1px solid ${T.border}`, background: "rgba(30,23,20,0.85)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ padding: "6px 14px", background: "rgba(222,158,72,0.08)", border: "1px solid rgba(222,158,72,0.25)", borderRadius: 8, boxShadow: "0 0 12px rgba(222,158,72,0.2), 0 0 24px rgba(222,158,72,0.08)", display: "inline-flex", alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: T.font }}>
            <span style={{ color: T.text }}>Tool</span>
            <span style={{ color: T.gold }}>Monkey</span>
          </span>
        </div>
      </nav>

      {/* Body */}
      <div style={{ height: "calc(100vh - 48px)", display: "flex", width: "100%", position: "relative", zIndex: 1 }}>

        {/* LEFT — 60% */}
        <div style={{ width: "60%", flexShrink: 0, padding: "32px 40px 32px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

          <h1 style={{ fontSize: 68, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 12px", lineHeight: 1, fontFamily: T.font }}>
            <span style={{ color: T.text }}>Tool</span>
            <span style={{ color: T.gold }}>Monkey</span>
          </h1>

          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: T.text, margin: "0 0 8px", lineHeight: 1.3, fontFamily: T.font }}>
            Test before production breaks you.
          </h2>

          <p style={{ fontSize: 14, color: T.textMut, lineHeight: 1.6, margin: "0 0 20px", fontFamily: T.font, maxWidth: 480 }}>
            Inject controlled failures into LLM tool-calling agents. Measure exactly how they break.
          </p>

          {/* Insight cards */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <GlowCard style={{ flex: 1, padding: "14px 16px" }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: T.gold, fontFamily: T.font, margin: "0 0 5px", letterSpacing: "-0.03em" }}>73%</p>
              <p style={{ fontSize: 11, color: T.textMut, fontFamily: T.font, margin: 0, lineHeight: 1.5 }}>of AI agent failures in production go undetected before shipping.</p>
            </GlowCard>
            <GlowCard style={{ flex: 1, padding: "14px 16px" }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: T.gold, fontFamily: T.font, margin: "0 0 5px", letterSpacing: "-0.03em" }}>25%</p>
              <p style={{ fontSize: 11, color: T.textMut, fontFamily: T.font, margin: 0, lineHeight: 1.5 }}>silent failure rate even when task completion shows 100%. Users get wrong answers with no warning.</p>
            </GlowCard>
          </div>

          {/* How it works */}
          <p style={{ fontSize: 10, fontWeight: 600, color: T.textMut, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: T.font, margin: "0 0 8px" }}>How it works</p>
          <div style={{ display: "flex", alignItems: "stretch", marginBottom: 24 }}>
            <div style={{ flex: 1 }}><StepCard num="01" title="Choose model" desc="Pick provider, inject a failure mode" /></div>
            <Arrow />
            <div style={{ flex: 1 }}><StepCard num="02" title="Watch live" desc="Agent attempts the task in real time" /></div>
            <Arrow />
            <div style={{ flex: 1 }}><StepCard num="03" title="Get score" desc="Reliability score across 4 metrics" /></div>
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push("/setup")}
            style={{ padding: "13px 40px", alignSelf: "flex-start", background: T.gold, border: "none", borderRadius: 980, color: "#1e1714", fontFamily: T.font, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", cursor: "pointer", marginBottom: 24, boxShadow: "0 0 20px rgba(222,158,72,0.35), 0 0 40px rgba(222,158,72,0.12)", transition: "background 0.18s ease, transform 0.1s ease, box-shadow 0.18s ease" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.goldHov; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 32px rgba(222,158,72,0.5), 0 0 64px rgba(222,158,72,0.18)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.gold; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(222,158,72,0.35), 0 0 40px rgba(222,158,72,0.12)"; }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {"Let's Begin"}
          </button>

          {/* Footer */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ fontSize: 11, color: T.textMut, letterSpacing: "0.05em", textTransform: "uppercase" as const, fontWeight: 500, fontFamily: T.font, margin: 0 }}>Chaos Monkey for LLM agents</p>
            <a href="https://www.linkedin.com/in/shubhsankalpdas/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontFamily: T.font, textDecoration: "none", display: "block" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
            >
              <span style={{ color: T.text }}>Made by </span>
              <span style={{ color: T.gold, textDecoration: "underline", textUnderlineOffset: "3px" }}>Shubh Sankalp Das</span>
            </a>
          </div>
        </div>

        {/* RIGHT — 40% with 50/50 vertical split */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", background: T.bg }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", background: "#3d2a10" }} />
          <div style={{ position: "relative", zIndex: 1, animation: "mascotGlow 3s ease-in-out infinite", borderRadius: "50%", border: "2px solid rgba(222,158,72,0.3)" }}>
            <MascotImage size={500} />
          </div>
        </div>
      </div>
    </div>
  );
}
