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

