import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AegisVaultCore3D } from "../components/AegisVaultCore3D";
import {
  ArrowUpRight,
  Shield,
  Zap,
  Terminal,
  Lock,
  Menu,
  X,
} from "lucide-react";

export function LandingHeroPage() {
  const [isSection2, setIsSection2] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [activePhase, setActivePhase] = useState(0); // 0: Intercept Threat Vector, 1: Settlement Frozen
  const [scrambledWord, setScrambledWord] = useState("settles.");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cursorRef = useRef(null);
  const targetPosRef = useRef({ x: -100, y: -100 });
  const currentPosRef = useRef({ x: -100, y: -100 });

  // 1. Smooth Reticle Cursor Animation Frame
  useEffect(() => {
    let animId;
    const handleMouseMove = (e) => {
      targetPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const renderCursor = () => {
      currentPosRef.current.x += (targetPosRef.current.x - currentPosRef.current.x) * 0.22;
      currentPosRef.current.y += (targetPosRef.current.y - currentPosRef.current.y) * 0.22;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${currentPosRef.current.x - 11}px, ${currentPosRef.current.y - 11}px, 0)`;
      }
      animId = requestAnimationFrame(renderCursor);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    animId = requestAnimationFrame(renderCursor);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // 2. High-Performance Passive Section Boundary Detector (Zero lag, 60fps)
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight || 1;
      const inSec2 = scrollY > vh * 0.45;
      setIsSection2((prev) => (prev !== inSec2 ? inSec2 : prev));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 3. 3-second two-phase deterministic loop
  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setActivePhase((prev) => (prev === 0 ? 1 : 0));
    }, 3000);
    return () => clearInterval(phaseTimer);
  }, []);

  // 4. 250ms Cryptographic character-decode effect when entering Phase 1
  useEffect(() => {
    if (activePhase === 1) {
      const targetWord = "settles.";
      const hexChars = "0123456789ABCDEF0x";
      let iteration = 0;
      const interval = setInterval(() => {
        setScrambledWord(
          targetWord
            .split("")
            .map((letter, index) => {
              if (index < iteration) return targetWord[index];
              return hexChars[Math.floor(Math.random() * hexChars.length)];
            })
            .join("")
        );
        iteration += 1.2;
        if (iteration >= targetWord.length) {
          setScrambledWord(targetWord);
          clearInterval(interval);
        }
      }, 30);
      return () => clearInterval(interval);
    } else {
      setScrambledWord("settles.");
    }
  }, [activePhase]);

  const handleInteractiveEnter = () => setIsHoveringInteractive(true);
  const handleInteractiveLeave = () => setIsHoveringInteractive(false);

  return (
    <div
      style={{ backgroundColor: isSection2 ? "#EAE6DF" : "#08090A" }}
      className="relative min-h-[220vh] w-full text-[#E8E5DE] selection:bg-[#8CB0DB] selection:text-black transition-colors duration-700 ease-institutional"
    >
      {/* =====================================================================
          ATMOSPHERIC LAYERS
          ===================================================================== */}
      {/* Radial Optical Backlight (centered behind 3D core in Hero) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 optical-backlight transition-opacity duration-700 ease-institutional"
        style={{ opacity: isSection2 ? 0.05 : 1 }}
      />

      {/* Subtle Film Grain Overlay */}
      <div className="film-grain" />

      {/* Precision Reticle Cursor */}
      <div
        ref={cursorRef}
        className={`reticle-cursor ${isHoveringInteractive ? "hovering-target" : ""}`}
      />

      {/* =====================================================================
          PERSISTENT 3D GYROSCOPE STAGE (Single canvas across sections)
          Camera frustum & delta-time smoothing glide seamlessly at 60fps
          ===================================================================== */}
      <div className="fixed inset-0 z-10 pointer-events-auto flex items-center justify-center">
        <div className="w-full h-full pointer-events-auto">
          <AegisVaultCore3D
            onHoverChange={(isHovered) => {
              setIsHoveringInteractive(isHovered);
            }}
          />
        </div>
      </div>

      {/* =====================================================================
          CLEAN TOP NAVIGATION BAR (De-cluttered, breathing room, responsive)
          ===================================================================== */}
      <header
        className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 lg:px-12 py-3.5 sm:py-5 flex justify-between items-center transition-all duration-700 ease-institutional"
        style={{
          color: isSection2 ? "#52555A" : "#E8E5DE",
          borderBottom: isSection2
            ? "1px solid rgba(26, 29, 32, 0.12)"
            : "1px solid rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(14px)",
          backgroundColor: isSection2
            ? "rgba(234, 230, 223, 0.85)"
            : "rgba(8, 9, 10, 0.75)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="font-hero-display text-sm tracking-wider text-[#F3F1EC] hover:opacity-80 transition-opacity"
          >
            RUNESTONE
          </Link>
          <span className="hidden sm:inline font-tech-mono text-[10px] tracking-[0.2em] text-[#7A7D82]">
            // AUTONOMOUS BANKING INFRASTRUCTURE
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <span className="text-[10px] font-tech-mono tracking-[0.18em] text-[#7A7D82]">
            JAVA 21 • MYSQL 8.0 • REDIS LUA • AI MCP
          </span>
          <Link
            to="/login"
            onMouseEnter={handleInteractiveEnter}
            onMouseLeave={handleInteractiveLeave}
            className={`px-4 py-1.5 rounded-full border text-[10px] font-tech-mono tracking-[0.2em] font-medium transition ${
              isSection2
                ? "border-black/20 text-[#52555A] hover:bg-black/5"
                : "border-white/20 text-[#E8E5DE] hover:bg-white/10"
            }`}
          >
            SIGN IN
          </Link>
        </div>

        {/* Mobile Header Controls (< md) */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/login"
            className={`px-3 py-1 rounded-full border text-[9px] font-tech-mono tracking-[0.16em] font-medium transition ${
              isSection2
                ? "border-black/20 text-[#52555A] hover:bg-black/5"
                : "border-white/20 text-[#E8E5DE] hover:bg-white/10"
            }`}
          >
            SIGN IN
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-1.5 rounded-md text-[#9CA3AF] hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu (< md) */}
      {mobileMenuOpen && (
        <div className="fixed top-[53px] left-0 right-0 z-40 md:hidden bg-[#0B0D0F]/95 backdrop-blur-xl border-b border-white/10 px-6 py-5 shadow-2xl animate-hero-pill">
          <div className="text-[9px] font-tech-mono tracking-[0.22em] text-[#7A7D82] uppercase mb-3">
            // OPERATIONAL DESTINATIONS
          </div>
          <div className="flex flex-col gap-2.5 font-tech-mono text-[11px] tracking-[0.14em]">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#E8E5DE] transition"
            >
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[#38BDF8]" />
                <span>TREASURY TERMINAL</span>
              </div>
              <ArrowUpRight size={12} className="text-[#7A7D82]" />
            </Link>
            <Link
              to="/compliance"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#E8E5DE] transition"
            >
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#F43F5E]" />
                <span>AML INVESTIGATIONS</span>
              </div>
              <ArrowUpRight size={12} className="text-[#7A7D82]" />
            </Link>
            <Link
              to="/batch-fx"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#E8E5DE] transition"
            >
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-[#F59E0B]" />
                <span>BATCH FX ENGINE</span>
              </div>
              <ArrowUpRight size={12} className="text-[#7A7D82]" />
            </Link>
            <Link
              to="/reconciliation"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#E8E5DE] transition"
            >
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#10B981]" />
                <span>EOD RECONCILIATION</span>
              </div>
              <ArrowUpRight size={12} className="text-[#7A7D82]" />
            </Link>
            <Link
              to="/transfer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#E8E5DE] transition"
            >
              <div className="flex items-center gap-2">
                <ArrowUpRight size={14} className="text-[#8CB0DB]" />
                <span>WIRE TRANSFER</span>
              </div>
              <ArrowUpRight size={12} className="text-[#7A7D82]" />
            </Link>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] font-tech-mono text-[#7A7D82]">
            <span>RUNESTONE AEGIS ENGINE</span>
            <span className="text-[#10B981]">● ONLINE</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          STAGE 1: DARK CARBON HERO (100vh, #08090A)
          Clean 3-Column Grid with tight typography & integrated right subheading
          ===================================================================== */}
      <section
        className={`relative z-20 min-h-screen w-full flex flex-col justify-between pt-20 sm:pt-24 pb-6 px-4 sm:px-8 lg:px-12 pointer-events-none transition-all duration-700 ease-institutional ${
          isSection2
            ? "opacity-0 -translate-y-8"
            : "opacity-100 translate-y-0"
        }`}
      >
        {/* Strict 12-Column Center Stage */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8 w-full max-w-[1440px] mx-auto my-auto">
          {/* Left Column (lg:col-span-4) — Pure Eyebrow & Unified Display Heading */}
          <div className="lg:col-span-4 flex flex-col justify-center pointer-events-auto select-none z-20">
            {/* High-Contrast Obsidian Glass Badge */}
            <div className="animate-hero-pill institutional-glass-badge inline-flex items-center gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-tech-mono tracking-[0.14em] text-[#E2E8F0] uppercase mb-4 sm:mb-6 w-fit transition-all duration-500 max-w-full">
              <span
                className="w-2 h-2 rounded-full transition-colors duration-700 animate-pulse shadow-sm shrink-0"
                style={{
                  backgroundColor: activePhase === 0 ? "#F43F5E" : "#38BDF8",
                  boxShadow:
                    activePhase === 0
                      ? "0 0 10px rgba(244, 63, 94, 0.8)"
                      : "0 0 10px rgba(56, 189, 248, 0.8)",
                }}
              />
              <span className="truncate">REAL-TIME TREASURY &amp; FRAUD INTERCEPTION</span>
            </div>

            {/* Main Institutional Heading (Tightly stacked, unified statement) */}
            <h1 className="font-display-sans text-3xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.06] sm:leading-[1.02] tracking-[-0.035em] font-[500] text-[#F3F1EC]">
              {/* Line 1: "Intercept fraud" */}
              <div
                className="relative block w-fit phase-transition-smooth"
                style={{
                  transform: activePhase === 0 ? "translateY(-2px)" : "translateY(0px)",
                  opacity: activePhase === 0 ? 1 : 0.88,
                }}
              >
                <span
                  className="inline-block transition-all duration-700 text-[#F3F1EC]"
                  style={{
                    textShadow:
                      activePhase === 0
                        ? "0 0 35px rgba(244, 63, 94, 0.4), 0 2px 20px rgba(255, 255, 255, 0.2)"
                        : "0 2px 20px rgba(255, 255, 255, 0.1)",
                  }}
                >
                  Intercept fraud
                </span>

                {/* Threat Vector Monospace Tag */}
                <span
                  className="ml-2 sm:ml-3 inline-flex items-center text-[8px] sm:text-[9px] font-tech-mono tracking-[0.16em] uppercase px-1.5 sm:px-2 py-0.5 rounded border transition-all duration-500 align-middle -translate-y-1"
                  style={{
                    opacity: activePhase === 0 ? 1 : 0,
                    backgroundColor: "rgba(136, 19, 55, 0.6)",
                    color: "#FDA4AF",
                    borderColor: "rgba(244, 63, 94, 0.4)",
                    transform: activePhase === 0 ? "scale(1)" : "scale(0.9)",
                  }}
                >
                  [THREAT_VECTOR]
                </span>

                {/* Razor-thin crimson laser scanline sweeping bottom edge when activePhase === 0 */}
                {activePhase === 0 && <div className="laser-scanline" />}
              </div>

              {/* Line 2: "before it settles." — stacked tightly */}
              <div
                className="relative block w-fit phase-transition-smooth"
                style={{
                  transform: activePhase === 1 ? "translateY(-2px)" : "translateY(0px)",
                  opacity: activePhase === 1 ? 1 : 0.78,
                }}
              >
                <span className="font-[400] transition-colors duration-700 mr-2 text-[#E2E8F0]">
                  before it
                </span>

                <span
                  className="font-editorial-serif text-[1.08em] tracking-[-0.02em] transition-all duration-700 inline-block font-normal"
                  style={{
                    backgroundImage:
                      activePhase === 1
                        ? "linear-gradient(135deg, #FFFFFF 15%, #7DD3FC 55%, #38BDF8 100%)"
                        : "linear-gradient(135deg, #E2E8F0 0%, #94A3B8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow:
                      activePhase === 1
                        ? "0 0 40px rgba(56, 189, 248, 0.45)"
                        : "none",
                  }}
                >
                  {scrambledWord}
                </span>
              </div>
            </h1>
          </div>

          {/* Center Column (lg:col-span-4) — 3D Bounded Zone */}
          <div className="lg:col-span-4 h-[220px] sm:h-[320px] lg:h-[480px] pointer-events-none relative" />

          {/* Right Column (lg:col-span-4) — LIVE 7-STAGE DEFENSE PIPELINE */}
          <div className="lg:col-span-4 flex flex-col justify-center pointer-events-auto select-none z-20 lg:pl-6">
            <div className="w-full max-w-full lg:max-w-[400px]">
              <div className="text-[10px] font-tech-mono tracking-[0.22em] text-[#8CB0DB] uppercase mb-2 font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                <span>LIVE 7-STAGE DEFENSE PIPELINE</span>
              </div>

              {/* Integrated Concise Subheading */}
              <p className="text-[12px] sm:text-[12.5px] leading-[1.6] text-[#94A3B8] mb-4 max-w-full lg:max-w-[340px] font-sans">
                Double-entry core banking fused with in-database 5-hop graph detection, sub-ms Redis velocity gates, and human-governed AI investigations.
              </p>

              {/* 7 Structured Pipeline Rows */}
              <div className="space-y-2.5 sm:space-y-3 font-tech-mono text-[11px] sm:text-[12px] border-l border-white/10 pl-3 sm:pl-4">
                <div className="leading-tight flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-[#7A7D82] text-[10px] sm:text-[11px]">01</span>
                  <span className="text-[#E8E5DE] font-semibold">IDEMPOTENCY</span>
                  <span className="text-[#9CA3AF] text-[10px] sm:text-[11px]">— Redis NX &amp; SHA-256 fence</span>
                </div>

                <div className="leading-tight flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-[#7A7D82] text-[10px] sm:text-[11px]">02</span>
                  <span className="text-[#E8E5DE] font-semibold">VELOCITY GATE</span>
                  <span className="text-[#9CA3AF] text-[10px] sm:text-[11px]">— 0.4ms atomic Lua burst limiter</span>
                </div>

                <div className="leading-tight flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 sm:gap-2 bg-[#F43F5E]/10 py-1 px-1.5 rounded border border-[#F43F5E]/30 -ml-1.5">
                  <span className="text-[#F43F5E] text-[10px] sm:text-[11px] font-bold">03</span>
                  <span className="text-[#FDA4AF] font-bold">5-HOP AML GRAPH</span>
                  <span className="text-[#FECDD3] text-[10px] sm:text-[11px]">— MySQL recursive cycle trap</span>
                </div>

                <div className="leading-tight flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-[#7A7D82] text-[10px] sm:text-[11px]">04</span>
                  <span className="text-[#E8E5DE] font-semibold">3-BUCKET ESCROW</span>
                  <span className="text-[#9CA3AF] text-[10px] sm:text-[11px]">— Zero-sum PENDING_HOLD isolation</span>
                </div>

                <div className="leading-tight flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-[#7A7D82] text-[10px] sm:text-[11px]">05</span>
                  <span className="text-[#E8E5DE] font-semibold">OUTBOX STREAM</span>
                  <span className="text-[#9CA3AF] text-[10px] sm:text-[11px]">— SKIP LOCKED relay to Kafka</span>
                </div>

                <div className="leading-tight flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 sm:gap-2 text-[#8CB0DB]">
                  <span className="text-[#8CB0DB] text-[10px] sm:text-[11px]">06</span>
                  <span className="font-semibold">AI DETECTIVE</span>
                  <span className="text-[#93C5FD] text-[10px] sm:text-[11px]">— MCP tools &amp; FinCEN/FATF RAG</span>
                </div>

                <div className="leading-tight flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-[#7A7D82] text-[10px] sm:text-[11px]">07</span>
                  <span className="text-[#E8E5DE] font-semibold">4-EYES HITL</span>
                  <span className="text-[#9CA3AF] text-[10px] sm:text-[11px]">— FINRA 3110 sign-off &amp; SAR PDF</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Bar & 5-Column Technical Telemetry Strip */}
        <div className="w-full max-w-[1440px] mx-auto mt-4 pointer-events-auto z-20">
          {/* Dual Pill Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-5 w-full max-w-md sm:max-w-none mx-auto">
            <Link
              to="/dashboard"
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className="text-center bg-[#E8E5DE] hover:bg-white text-[#08090A] rounded-full px-6 sm:px-8 py-3 text-[11px] font-tech-mono tracking-[0.22em] uppercase font-bold shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-h-[44px] flex items-center justify-center"
            >
              LAUNCH TREASURY TERMINAL
            </Link>

            <Link
              to="/compliance"
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
              className="text-center border border-white/25 hover:border-white/60 bg-black/40 backdrop-blur-md text-[#9CA3AF] hover:text-white rounded-full px-6 sm:px-7 py-3 text-[11px] font-tech-mono tracking-[0.22em] uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-h-[44px] flex items-center justify-center"
            >
              OPEN AML COMMAND CENTER
            </Link>
          </div>

          {/* 5-Column Bottom Strip */}
          <div className="border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-white/10 select-none">
            <div className="py-2.5 sm:py-3 px-3 sm:px-6">
              <div className="text-xs sm:text-base font-bold font-tech-mono text-[#E8E5DE] tracking-tight">
                Σ $0.0000
              </div>
              <div className="text-[8px] sm:text-[9px] font-tech-mono tracking-[0.2em] text-[#7A7D82] uppercase mt-0.5">
                DOUBLE-ENTRY INVARIANT
              </div>
            </div>

            <div className="py-2.5 sm:py-3 px-3 sm:px-6">
              <div className="text-xs sm:text-base font-bold font-tech-mono text-[#E8E5DE] tracking-tight">
                0.4 ms
              </div>
              <div className="text-[8px] sm:text-[9px] font-tech-mono tracking-[0.2em] text-[#7A7D82] uppercase mt-0.5">
                REDIS LUA VELOCITY
              </div>
            </div>

            <div className="py-2.5 sm:py-3 px-3 sm:px-6">
              <div className="text-xs sm:text-base font-bold font-tech-mono text-[#F43F5E] tracking-tight">
                5-HOP CTE
              </div>
              <div className="text-[8px] sm:text-[9px] font-tech-mono tracking-[0.2em] text-[#7A7D82] uppercase mt-0.5">
                IN-DB RING DETECTION
              </div>
            </div>

