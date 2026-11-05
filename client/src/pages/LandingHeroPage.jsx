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
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  playAddCharSound,
  playRemoveCharSound,
  playUiButtonClickSound,
  playButtonClickSound,
  playButtonHoverSound,
  isAudioMuted,
  toggleAudioMute,
} from "../utils/soundEngine";

const SUB_LINES = [
  { prefix: "before it ", target: "settles." },
  { prefix: "across five ", target: "hops." },
  { prefix: "under burst ", target: "velocity." },
  { prefix: "inside zero-sum ", target: "ledgers." },
];

export function LandingHeroPage() {
  const [isSection2, setIsSection2] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(isAudioMuted());

  // Typewriter state
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(
    SUB_LINES[0].prefix.length + SUB_LINES[0].target.length
  );
  const [isThreatPulse, setIsThreatPulse] = useState(false);
  const [laserActive, setLaserActive] = useState(false);

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

  // 3. Exact Pacing Typewriter Loop: Hold (2600ms) -> Red Pulse & Laser Pre-Sweep (550ms) -> Delete RTL -> Pause (420ms) -> Type LTR
  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    const wait = (ms) =>
      new Promise((resolve) => {
        timerId = setTimeout(resolve, ms);
      });

    const runTypewriterLoop = async () => {
      let currentIdx = 0;
      let currLen = SUB_LINES[0].prefix.length + SUB_LINES[0].target.length;

      while (isMounted) {
        // Step 1: HOLD PHASE (2600ms) - Hold completed phrase steady
        setIsThreatPulse(false);
        setLaserActive(false);
        await wait(2600);
        if (!isMounted) break;

        // Step 2: RED PULSE & LASER PRE-SWEEP (550ms) - Activate crimson text-shadow & sweep line
        setIsThreatPulse(true);
        setLaserActive(true);
        await wait(550);
        if (!isMounted) break;

        // Step 3: SLOW RIGHT-TO-LEFT DELETION
        // Base speed: 95ms per character. If removing space (' '), add 150ms micro-pause (total 245ms).
        const currentFullPhrase =
          SUB_LINES[currentIdx].prefix + SUB_LINES[currentIdx].target;
        while (currLen > 0) {
          const charRemoved = currentFullPhrase[currLen - 1];
          currLen--;
          setCharIndex(currLen);
          playRemoveCharSound(charRemoved);

          const delay = charRemoved === " " ? 95 + 150 : 95;
          await wait(delay);
          if (!isMounted) break;
        }
        if (!isMounted) break;

        // Step 4: EMPTY PAUSE BEFORE NEW PHRASE (420ms) - Block cursor resting on left margin
        setIsThreatPulse(false);
        setLaserActive(false);
        currentIdx = (currentIdx + 1) % SUB_LINES.length;
        setPhraseIndex(currentIdx);
        await wait(420);
        if (!isMounted) break;

        // Step 5: SLOW LEFT-TO-RIGHT TYPING
        // Base speed: 135ms per character. If character just typed is space (' '), pause 210ms.
        const nextFullPhrase =
          SUB_LINES[currentIdx].prefix + SUB_LINES[currentIdx].target;
        const targetLen = nextFullPhrase.length;

        while (currLen < targetLen) {
          const charAdded = nextFullPhrase[currLen];
          currLen++;
          setCharIndex(currLen);
          playAddCharSound(charAdded);

          const delay = charAdded === " " ? 210 : 135;
          await wait(delay);
          if (!isMounted) break;
        }
        if (!isMounted) break;
      }
    };

    runTypewriterLoop();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const handleToggleAudio = () => {
    const nextState = toggleAudioMute();
    setIsMuted(nextState);
    if (!nextState) {
      playButtonClickSound();
    }
  };

  const handleInteractiveEnter = () => setIsHoveringInteractive(true);
  const handleInteractiveLeave = () => setIsHoveringInteractive(false);

  // Compute in-place visible character substrings for the dual-tone rendering
  const currentSubLine = SUB_LINES[phraseIndex] || SUB_LINES[0];
  const prefix = currentSubLine.prefix;
  const target = currentSubLine.target;
  const prefixLen = prefix.length;

  let prefixVisible = "";
  let targetVisible = "";

  if (charIndex <= prefixLen) {
    prefixVisible = prefix.slice(0, charIndex);
    targetVisible = "";
  } else {
    prefixVisible = prefix;
    targetVisible = target.slice(0, charIndex - prefixLen);
  }

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
          CLEAN TOP NAVIGATION BAR (FourEyes Branded, De-cluttered, Responsive)
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
            onClick={() => playButtonClickSound()}
            onMouseEnter={() => playButtonHoverSound()}
            className="flex items-center gap-3 select-none group"
          >
            <div className="relative shrink-0 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="FourEyes Mark"
                className="w-8 h-8 rounded-lg object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.4)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-[-0.03em] text-[#F3F1EC] group-hover:text-white transition-colors font-['Plus_Jakarta_Sans',sans-serif] text-base">
                  Four<span className="text-[#38BDF8]">Eyes</span>
                </span>
                <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-[#8CB0DB] bg-white/[0.04] border border-white/10 px-1.5 py-0.5 rounded leading-none">
                  CORE
                </span>
              </div>
              <span className="font-mono text-[8.5px] tracking-[0.2em] text-[#6E737D] uppercase leading-none mt-0.5">
                FOUREYES // AUTONOMOUS BANKING INFRASTRUCTURE
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          {/* Mechanical Audio Mute Toggle Pill */}
          <button
            type="button"
            onClick={handleToggleAudio}
            onMouseEnter={() => playButtonHoverSound()}
            className="px-2.5 py-1 rounded-full border border-white/10 hover:border-white/25 bg-white/[0.04] text-[9.5px] font-mono tracking-[0.14em] uppercase transition flex items-center gap-1.5 text-[#9CA3AF] hover:text-white"
            title="Toggle Mechanical Keystroke Sound Effects"
          >
            {isMuted ? (
              <>
                <VolumeX size={12} className="text-[#F43F5E]" />
                <span>[ 🔇 AUDIO: MUTED ]</span>
              </>
            ) : (
              <>
                <Volume2 size={12} className="text-[#38BDF8]" />
                <span>[ 🔊 AUDIO: ON ]</span>
              </>
            )}
          </button>

          <span className="text-[10px] font-tech-mono tracking-[0.18em] text-[#7A7D82]">
            JAVA 21 • MYSQL 8.0 • REDIS LUA • AI MCP
          </span>

          <Link
            to="/login"
            onClick={() => playButtonClickSound()}
            onMouseEnter={() => {
              handleInteractiveEnter();
              playButtonHoverSound();
            }}
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
          <button
            type="button"
            onClick={handleToggleAudio}
            className="p-1 rounded-full border border-white/10 text-[#9CA3AF]"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX size={14} className="text-[#F43F5E]" /> : <Volume2 size={14} className="text-[#38BDF8]" />}
          </button>

          <Link
            to="/login"
            onClick={() => playButtonClickSound()}
            className={`px-3 py-1 rounded-full border text-[9px] font-tech-mono tracking-[0.16em] font-medium transition ${
