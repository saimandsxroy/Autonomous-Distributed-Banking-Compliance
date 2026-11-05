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
 * - Real-time Raycasting with floating subsystem status HUD (1.38x scale spring, emissive glow, custom cursor)
 */
export function AegisVaultCore3D({ className = "", onHoverChange }) {
  const containerRef = useRef(null);
  const hudRef = useRef(null);
  const hudBadgeRef = useRef(null);
  const hudDotRef = useRef(null);
  const hudTextRef = useRef(null);

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
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.pointerEvents = "auto";
    renderer.domElement.style.touchAction = "pan-y";
    container.appendChild(renderer.domElement);

    // --- Raycasting & Hover State Setup ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let hoveredObject = null;

    const handleMouseMove = (event) => {
      if (!renderer.domElement) return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      }
    };

    const handleMouseLeave = () => {
      mouse.x = -999;
      mouse.y = -999;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseout", handleMouseLeave, { passive: true });

    // --- Studio Lighting Setup ---
    const ambientLight = new THREE.AmbientLight(0x0a101d, 1.8);
    scene.add(ambientLight);

    // Cool sapphire key light (front-left)
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 3.5);
    keyLight.position.set(-4, 3, 5);
    scene.add(keyLight);

    // Crisp white top-rim light to catch metallic gimbal bevels
    const rimLight = new THREE.DirectionalLight(0xffffff, 4.2);
    rimLight.position.set(3, 6, -2);
    scene.add(rimLight);

    // High-alert crimson accent light (reflects the AML quarantine node)
    const crimsonLight = new THREE.PointLight(0xf43f5e, 5.0, 4.5, 2.0);
    crimsonLight.position.set(1.3, -0.6, 0.8);
    scene.add(crimsonLight);

    // Radiant blue ledger heart light
    const ledgerCoreLight = new THREE.PointLight(0x2563eb, 4.0, 3.5, 2.0);
    ledgerCoreLight.position.set(0, 0, 0);
    scene.add(ledgerCoreLight);

    // --- Master Pivot Group (Root Group) ---
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // =========================================================================
    // LAYER 1: CENTRAL DOUBLE-ENTRY LEDGER CORE (coreGroup)
    // =========================================================================
    const coreGroup = new THREE.Group();
    masterGroup.add(coreGroup);

    // Dark titanium faceted icosahedron core
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.92,
      roughness: 0.18,
      flatShading: true,
    });
    const coreGeo = new THREE.IcosahedronGeometry(0.52, 0);
    const coreMesh = new THREE.Mesh(coreGeo, titaniumMat);
    coreMesh.userData = { type: "core", label: "CORE: ZERO-SUM LEDGER Σ=$0.0000" };
    coreGroup.add(coreMesh);

    // Wireframe cage around inner core
    const coreWireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const coreWire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.56, 1), coreWireMat);
    coreGroup.add(coreWire);

    // Outer refractive sapphire glass shell
    const sapphireShellMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      transmission: 0.72,
      opacity: 0.88,
      transparent: true,
      metalness: 0.15,
      roughness: 0.1,
      ior: 1.65,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const shellGeo = new THREE.SphereGeometry(0.72, 32, 32);
    const shellMesh = new THREE.Mesh(shellGeo, sapphireShellMat);
    shellMesh.userData = { type: "core", label: "CORE: ZERO-SUM LEDGER Σ=$0.0000" };
    coreGroup.add(shellMesh);

    // Zero-sum invariant equatorial ring around the core
    const eqRingGeo = new THREE.TorusGeometry(0.82, 0.012, 16, 64);
    const eqRingMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.65,
    });
    const eqRing = new THREE.Mesh(eqRingGeo, eqRingMat);
    eqRing.rotation.x = Math.PI / 2;
    coreGroup.add(eqRing);

    // =========================================================================
    // LAYER 2: 3D 5-HOP GRAPH & FRAUD RING CONSTELLATION (networkGroup)
    // =========================================================================
    const networkGroup = new THREE.Group();
    masterGroup.add(networkGroup);

    // Node Positions in 3D Orbital Space (radius ~ 1.35 to 1.6)
    // Nodes 0, 1, 2 represent the circular 3-hop ring: Alice (#1) -> Bob (#2) -> Charlie (#3) -> Alice (#1)
    const nodeCoords = [
      new THREE.Vector3(-1.15, 0.85, 0.45),   // Node 0: Alice (Leg 1 Source)
      new THREE.Vector3(0.15, 1.35, -0.4),    // Node 1: Bob (Leg 2 Mule)
      new THREE.Vector3(1.3, -0.6, 0.7),      // Node 2: Charlie (QUARANTINED INTERCEPT)
      new THREE.Vector3(-1.4, -0.65, -0.5),   // Node 3: Liquidity Pool USD
      new THREE.Vector3(-0.45, -1.35, 0.45),  // Node 4: Clearing Nostro
      new THREE.Vector3(1.05, 0.95, -0.6),    // Node 5: Treasury Escrow
      new THREE.Vector3(1.35, 0.15, -0.85),   // Node 6: Fedwire Gateway
      new THREE.Vector3(-0.85, 0.25, -1.25),  // Node 7: Corporate Client
      new THREE.Vector3(0.55, -1.25, -0.75),  // Node 8: FX Partner Bank
      new THREE.Vector3(-0.15, 0.0, 1.45),    // Node 9: Vostro Settlement
    ];

    const nodeMeshes = [];
    const legitimateNodeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });

    const crimsonNodeMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xe11d48,
      emissiveIntensity: 0.85,
    });

    nodeCoords.forEach((pos, idx) => {
      const isAmlRing = idx <= 2;
      const isQuarantineTarget = idx === 2; // Charlie #3 where recursive CTE caught cycle
      const radius = isQuarantineTarget ? 0.13 : isAmlRing ? 0.105 : 0.085;

      const nodeGeo = new THREE.SphereGeometry(radius, 24, 24);
      const baseMat = isAmlRing ? crimsonNodeMat : legitimateNodeMat;
      const nodeMesh = new THREE.Mesh(nodeGeo, baseMat.clone());
      nodeMesh.position.copy(pos);
      nodeMesh.userData = {
        id: idx,
        isAmlRing,
        isQuarantineTarget,
        basePos: pos.clone(),
        label:
          idx === 2
            ? "NODE #3: 5-HOP AML RING QUARANTINED"
            : idx <= 2
            ? `NODE #${idx + 1}: AML SUSPECT MULE HOP`
            : `NODE #${idx + 1}: AUTHORIZED SETTLEMENT RAILS`,
      };
      networkGroup.add(nodeMesh);
      nodeMeshes.push(nodeMesh);

      // Add rotating wireframe quarantine cage around Charlie #3
      if (isQuarantineTarget) {
        const cageGeo = new THREE.OctahedronGeometry(0.24, 0);
        const cageMat = new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          wireframe: true,
          transparent: true,
          opacity: 0.85,
        });
        const cageMesh = new THREE.Mesh(cageGeo, cageMat);
        cageMesh.name = "quarantineCage";
        nodeMesh.add(cageMesh);

        // High-alert pulsing warning ring
        const ringGeo = new THREE.RingGeometry(0.25, 0.28, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        });
        const pulseRing = new THREE.Mesh(ringGeo, ringMat);
        pulseRing.name = "pulseRing";
        nodeMesh.add(pulseRing);
      }
    });

    // --- Edges / Settlement Tubes ---
    const cleanEdgePairs = [
      [3, 4], [4, 9], [3, 7], [5, 6], [6, 8], [7, 0], [8, 4]
    ];

    const amlEdgePairs = [
      [0, 1], // Leg 1: Alice -> Bob ($120.00)
      [1, 2], // Leg 2: Bob -> Charlie ($110.00)
      [2, 0], // Leg 3: Charlie -> Alice ($100.00) CLOSED LOOP INTERCEPTED!
    ];

    const cleanTubes = [];
    cleanEdgePairs.forEach(([i, j]) => {
      const p1 = nodeCoords[i];
      const p2 = nodeCoords[j];
      const curve = new THREE.LineCurve3(p1, p2);
      const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.016, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        roughness: 0.3,
        metalness: 0.8,
        transparent: true,
        opacity: 0.75,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      networkGroup.add(tube);
      cleanTubes.push({ tube, curve });
    });

    const amlTubes = [];
    amlEdgePairs.forEach(([i, j]) => {
      const p1 = nodeCoords[i];
      const p2 = nodeCoords[j];
      const curve = new THREE.LineCurve3(p1, p2);
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.024, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.95,
        roughness: 0.2,
        metalness: 0.9,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      networkGroup.add(tube);
      amlTubes.push({ tube, curve });
    });

    // Data packet particles animating along edges
    const particleCount = 18;
    const particleGeo = new THREE.SphereGeometry(0.028, 8, 8);
    const cleanParticleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const crimsonParticleMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    const particles = [];
    for (let k = 0; k < particleCount; k++) {
      const isCrimson = k < 6;
      const pMesh = new THREE.Mesh(particleGeo, isCrimson ? crimsonParticleMat : cleanParticleMat);
      networkGroup.add(pMesh);

      const targetCurves = isCrimson ? amlTubes : cleanTubes;
      const targetEdge = targetCurves[k % targetCurves.length];
      particles.push({
        mesh: pMesh,
        curve: targetEdge.curve,
        progress: k / particleCount,
        speed: 0.006 + Math.random() * 0.004,
        isCrimson,
      });
    }

    // =========================================================================
    // LAYER 3: DUAL MACHINED TITANIUM GIMBAL RINGS (gimbalGroup)
    // =========================================================================
    const gimbalGroup = new THREE.Group();
    masterGroup.add(gimbalGroup);

    const gimbalMat1 = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.88,
      roughness: 0.24,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.0,
    });

    const gimbalMat2 = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.92,
      roughness: 0.2,
      emissive: new THREE.Color(0x8cb0db),
      emissiveIntensity: 0.0,
    });

    // Ring 1: Velocity Shield Gimbal (radius = 1.95)
    const ring1Geo = new THREE.TorusGeometry(1.95, 0.024, 16, 80);
    const gimbalRing1 = new THREE.Mesh(ring1Geo, gimbalMat1);
    gimbalRing1.userData = { type: "gimbal", label: "GIMBAL: 0.4ms REDIS LUA SHIELD" };
    gimbalGroup.add(gimbalRing1);

    // Ring 1 tick notches
    for (let t = 0; t < 12; t++) {
      const ang = (t * Math.PI * 2) / 12;
      const notchGeo = new THREE.BoxGeometry(0.03, 0.06, 0.04);
      const notch = new THREE.Mesh(notchGeo, new THREE.MeshBasicMaterial({ color: 0x8cb0db }));
      notch.position.set(Math.cos(ang) * 1.95, Math.sin(ang) * 1.95, 0);
      notch.rotation.z = ang;
      gimbalRing1.add(notch);
    }

    // Ring 2: SHA-256 Audit Gimbal (radius = 2.15, tilted at 65 deg)
    const ring2Geo = new THREE.TorusGeometry(2.15, 0.025, 16, 80);
    const gimbalRing2 = new THREE.Mesh(ring2Geo, gimbalMat2);
    gimbalRing2.userData = { type: "gimbal", label: "GIMBAL: SHA-256 TAMPER-EVIDENT AUDIT CHAIN" };
