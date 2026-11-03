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
