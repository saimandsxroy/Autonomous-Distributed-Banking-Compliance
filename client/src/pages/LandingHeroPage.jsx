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
