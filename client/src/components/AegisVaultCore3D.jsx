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
    gimbalRing2.rotation.x = Math.PI / 2.8;
    gimbalGroup.add(gimbalRing2);

    // Ring 2 tick notches
    for (let t = 0; t < 16; t++) {
      const ang = (t * Math.PI * 2) / 16;
      const notchGeo = new THREE.BoxGeometry(0.03, 0.06, 0.04);
      const notch = new THREE.Mesh(notchGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      notch.position.set(Math.cos(ang) * 2.15, Math.sin(ang) * 2.15, 0);
      notch.rotation.z = ang;
      gimbalRing2.add(notch);
    }

    const interactableObjects = [
      ...nodeMeshes,
      gimbalRing1,
      gimbalRing2,
      coreMesh,
      shellMesh,
    ];

    // --- Interactive Drag Handling ---
    const handlePointerDown = (e) => {
      isDraggingRef.current = true;
      previousMousePosRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = "grabbing";
    };

    const handlePointerMove = (e) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePosRef.current.x;
      const deltaY = e.clientY - previousMousePosRef.current.y;

      dragRotationRef.current.y += deltaX * 0.006;
      dragRotationRef.current.x += deltaY * 0.006;
      currentDragVelocityRef.current = { x: deltaY * 0.006, y: deltaX * 0.006 };

      previousMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = hoveredObject ? "pointer" : "default";
    };

    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    // Resize Handler with responsive mobile camera adjustment
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      const mobile = newWidth < 768;
      camera.position.z = mobile ? 9.8 : 7.2;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // --- Animation Loop with Frame-Rate Independent Exponential Smoothing ---
    let clock = new THREE.Clock();
    let lastTime = performance.now();
    let smoothProgress = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsedTime = clock.getElapsedTime();

      // Delta-time damping exponential smoothing:
      // damp = 1 - Math.exp(-5.5 * dt)
      const damp = 1 - Math.exp(-5.5 * dt);
      smoothProgress += (scrollProgressRef.current - smoothProgress) * damp;

      // Smooth cubic ease-in-out curve
      const ease =
        smoothProgress < 0.5
          ? 4 * smoothProgress ** 3
          : 1 - Math.pow(-2 * smoothProgress + 2, 3) / 2;

      // Inertia decay for dragging
      if (!isDraggingRef.current) {
        dragRotationRef.current.x += currentDragVelocityRef.current.x;
        dragRotationRef.current.y += currentDragVelocityRef.current.y;
        currentDragVelocityRef.current.x *= 0.94;
        currentDragVelocityRef.current.y *= 0.94;
      }

      // Root rotation: continuous gentle autonomous spin + drag + subtle scroll ease
      masterGroup.rotation.x =
        dragRotationRef.current.x + Math.sin(elapsedTime * 0.35) * 0.08 + ease * 0.2;
      masterGroup.rotation.y += dt * 0.22 + ease * 0.02;
      masterGroup.rotation.z = Math.cos(elapsedTime * 0.25) * 0.05;

      // Opposing gimbal ring rotations
      gimbalRing1.rotation.z = elapsedTime * 0.25;
      gimbalRing2.rotation.z = -elapsedTime * 0.2;

      // Smooth WebGL space glide: from dead-center (0) to right column (+1.95) on desktop; stay centered on mobile
      const isMobileScreen = (container.clientWidth || window.innerWidth) < 768;
      masterGroup.position.x = isMobileScreen ? 0 : ease * 1.95;
      masterGroup.position.y = isMobileScreen ? ease * -0.35 : ease * -0.12;

      // Smoothly expand outer node/gimbal radius by (1 + ease * 0.15) in Section 2
      const scaleMultiplier = 1 + ease * 0.15;
      gimbalGroup.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);
      networkGroup.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);

      // Ledger core gentle breathing pulse
      const corePulse = 1.0 + Math.sin(elapsedTime * 2.5) * 0.035;
      coreGroup.scale.set(corePulse, corePulse, corePulse);
      coreWire.rotation.y = elapsedTime * 0.3;
      coreWire.rotation.x = elapsedTime * 0.2;

      // Animate quarantine cage around Charlie #3
      const quarantineNode = nodeMeshes[2];
      if (quarantineNode) {
        const cage = quarantineNode.getObjectByName("quarantineCage");
        if (cage) {
          cage.rotation.y = elapsedTime * 1.8;
          cage.rotation.z = elapsedTime * 1.2;
        }
        const pulse = quarantineNode.getObjectByName("pulseRing");
        if (pulse) {
          const s = 1.0 + Math.sin(elapsedTime * 4.0) * 0.25;
          pulse.scale.set(s, s, s);
          pulse.material.opacity = 0.5 + Math.sin(elapsedTime * 4.0) * 0.3;
        }
      }

      // Animate data particles along tubes
      particles.forEach((pt) => {
        pt.progress += pt.speed;
        if (pt.progress > 1.0) pt.progress = 0.0;
        const ptPos = pt.curve.getPointAt(pt.progress);
        pt.mesh.position.copy(ptPos);
      });

      // --- Raycasting & Hover Feedback ---
      if (!isDraggingRef.current && mouse.x > -900) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactableObjects, false);

        if (intersects.length > 0) {
          const firstHit = intersects[0].object;
          if (hoveredObject !== firstHit) {
            hoveredObject = firstHit;
            document.body.style.cursor = "pointer";
            if (onHoverChange) {
              onHoverChange(true, firstHit.userData || { label: "Interactive Object" });
            }
          }
        } else {
          if (hoveredObject !== null) {
            hoveredObject = null;
            document.body.style.cursor = "default";
            if (onHoverChange) {
              onHoverChange(false, null);
            }
          }
        }
      } else if (hoveredObject !== null) {
        hoveredObject = null;
        if (!isDraggingRef.current) {
          document.body.style.cursor = "default";
        }
        if (onHoverChange) {
          onHoverChange(false, null);
        }
      }

      // Position & Content for the floating HUD tooltip near the hovered object
      if (hoveredObject && hudRef.current && hudBadgeRef.current && hudDotRef.current && hudTextRef.current) {
        const worldPos = new THREE.Vector3();
        hoveredObject.getWorldPosition(worldPos);
        worldPos.project(camera);

        const sx = (worldPos.x * 0.5 + 0.5) * container.clientWidth;
        const sy = (-(worldPos.y * 0.5) + 0.5) * container.clientHeight;

        hudRef.current.style.opacity = "1";
        hudRef.current.style.transform = `translate3d(${sx}px, ${sy - 18}px, 0) translate(-50%, -100%)`;

        let label = hoveredObject.userData?.label || "NODE STATUS ACTIVE";
        let isAlert = Boolean(hoveredObject.userData?.isAmlRing || hoveredObject.userData?.isQuarantineTarget);

        hudTextRef.current.textContent = label;

        if (isAlert) {
          hudBadgeRef.current.className =
            "px-3 py-1.5 rounded-xl border text-[10.5px] font-mono tracking-wider font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2 whitespace-nowrap bg-[#0C1017]/95 border-rose-500/50 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.35)]";
          hudDotRef.current.className = "w-2 h-2 rounded-full bg-rose-500 animate-pulse";
        } else {
          hudBadgeRef.current.className =
            "px-3 py-1.5 rounded-xl border text-[10.5px] font-mono tracking-wider font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2 whitespace-nowrap bg-[#0C1017]/95 border-[#38BDF8]/40 text-[#E0F2FE] shadow-[0_0_25px_rgba(56,189,248,0.3)]";
          hudDotRef.current.className = "w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse";
        }
      } else if (hudRef.current) {
        hudRef.current.style.opacity = "0";
      }

      // Smooth hover scale & emissive spring on nodes (1.0 -> 1.38 lerp)
      nodeMeshes.forEach((node) => {
        const isHovered = hoveredObject === node;
        const targetScale = isHovered ? 1.38 : 1.0;
        node.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), damp * 3.5);

        if (node.userData.isAmlRing) {
          const baseEmissive = node.userData.isQuarantineTarget ? 1.0 : 0.85;
          const targetEmissive = isHovered ? 2.6 : baseEmissive;
          node.material.emissiveIntensity +=
            (targetEmissive - node.material.emissiveIntensity) * damp * 3.5;
          if (isHovered) {
            node.material.emissive.setHex(0xff1744);
          } else {
            node.material.emissive.setHex(0xe11d48);
          }
        } else {
          const baseEmissive = 0.35;
          const targetEmissive = isHovered ? 2.0 : baseEmissive;
          node.material.emissiveIntensity +=
            (targetEmissive - node.material.emissiveIntensity) * damp * 3.5;
          if (isHovered) {
            node.material.emissive.setHex(0x7dd3fc);
          } else {
            node.material.emissive.setHex(0x0284c7);
          }
        }
      });

      // Smooth hover glow on gimbal rings
      const isRing1Hovered = hoveredObject === gimbalRing1;
      const targetRing1Emissive = isRing1Hovered ? 0.95 : 0.0;
      gimbalMat1.emissiveIntensity +=
        (targetRing1Emissive - gimbalMat1.emissiveIntensity) * damp * 3.0;

      const isRing2Hovered = hoveredObject === gimbalRing2;
      const targetRing2Emissive = isRing2Hovered ? 0.95 : 0.0;
      gimbalMat2.emissiveIntensity +=
        (targetRing2Emissive - gimbalMat2.emissiveIntensity) * damp * 3.0;

      // Smooth hover reaction on ledger core
      const isCoreHovered = hoveredObject === coreMesh || hoveredObject === shellMesh;
      const targetCorePulse = isCoreHovered ? corePulse * 1.2 : corePulse;
      coreGroup.scale.lerp(
        new THREE.Vector3(targetCorePulse, targetCorePulse, targetCorePulse),
        damp * 2.5
      );

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
      container.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("resize", handleResize);
      document.body.style.cursor = "default";
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none flex items-center justify-center ${className}`}
    >
      {/* Floating 3D Subsystem Status HUD Tag */}
      <div
        ref={hudRef}
        className="pointer-events-none absolute left-0 top-0 z-30 transition-opacity duration-150 will-change-transform"
        style={{ opacity: 0 }}
      >
        <div
          ref={hudBadgeRef}
          className="px-3 py-1.5 rounded-xl border text-[10.5px] font-mono tracking-wider font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2 whitespace-nowrap bg-[#0C1017]/95 border-[#38BDF8]/40 text-[#E0F2FE]"
        >
          <span ref={hudDotRef} className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
          <span ref={hudTextRef}>NODE STATUS ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
