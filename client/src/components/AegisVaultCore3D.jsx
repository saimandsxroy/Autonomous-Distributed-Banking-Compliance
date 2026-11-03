import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * 3D Autonomous Banking Fraud Interception & Double-Entry Ledger Gyroscope
 * Features:
 * - 60fps Frame-Rate Independent Exponential Smoothing (Delta-time damping)
 * - Zero React re-renders on scroll via passive ref-based progress tracking
 * - Smooth WebGL glide from dead-center (x=0) to right column (x=1.95)
 * - Layer 1: Central Double-Entry Ledger Core (pulsing titanium icosahedron + refractive sapphire shell)
 * - Layer 2: 3D 5-Hop Counterparty Graph with clean cyan rails & intercepted crimson AML ring with quarantine octahedron
 * - Layer 3: Dual concentric machined titanium gimbal security rings (Redis Lua Shield & SHA-256 Audit Chain)
 * - Clean, non-overlapping canvas without HUD badge overlays
 */
export function AegisVaultCore3D({ className = "", onHoverChange }) {
  const containerRef = useRef(null);
  const scrollProgressRef = useRef(0);
  const isDraggingRef = useRef(false);
  const previousMousePosRef = useRef({ x: 0, y: 0 });
  const dragRotationRef = useRef({ x: 0.15, y: -0.2 });
  const currentDragVelocityRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Passive scroll progress listener (Zero React state re-renders)
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight || 1;
      scrollProgressRef.current = Math.min(1, Math.max(0, scrollY / vh));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // --- Scene Setup ---
    const scene = new THREE.Scene();

    // Strict camera frustum: distance 7.2 on desktop, scaled back to 9.8 on mobile to bound scene cleanly
    const isMobileInit = width < 768;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, isMobileInit ? 9.8 : 7.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
