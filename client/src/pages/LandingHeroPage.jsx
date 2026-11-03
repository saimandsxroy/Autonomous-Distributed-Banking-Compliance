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
