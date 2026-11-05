/**
 * Web Audio API Crisp Mechanical Interface Sound Synthesizer
 * Zero external audio files required.
 * Synthesizes tactile single-button clicks, mechanical key actions, and UI transients.
 */

let audioCtx = null;
let isMutedState = false;

// Initialize or retrieve shared AudioContext
function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// Automatically unlock AudioContext on user interaction
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

if (typeof window !== "undefined") {
  const unlockEvents = ["pointerdown", "keydown", "click"];
  const handleInitialInteraction = () => {
    unlockAudio();
    unlockEvents.forEach((evt) =>
      window.removeEventListener(evt, handleInitialInteraction)
    );
  };
  unlockEvents.forEach((evt) =>
    window.addEventListener(evt, handleInitialInteraction, { passive: true })
  );
}

export function isAudioMuted() {
  return isMutedState;
}

export function setAudioMuted(muted) {
  isMutedState = Boolean(muted);
  if (!isMutedState) {
    unlockAudio();
  }
  return isMutedState;
}

export function toggleAudioMute() {
  return setAudioMuted(!isMutedState);
}

/**
 * Triggered when adding 1 character left-to-right.
 * - If spacebar (' '): deeper, softer button press (125Hz -> 48Hz over 35ms + 950Hz click at gain 0.065)
 * - If regular char: crisp distinct single button click (2100Hz 8ms click + 180Hz -> 62Hz body over 28ms at gain 0.07)
 */
export function playAddCharSound(char) {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  try {
    if (char === " ") {
      // Spacebar: deeper, softer button press
      // 1. Transient click
      const click = ctx.createOscillator();
      click.type = "sine";
      click.frequency.setValueAtTime(950, now);
      click.frequency.exponentialRampToValueAtTime(320, now + 0.012);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.065, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.012);

      click.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(now);
      click.stop(now + 0.014);

      // 2. Thock body (125Hz -> 48Hz triangle over 35ms)
      const thock = ctx.createOscillator();
      thock.type = "triangle";
      thock.frequency.setValueAtTime(125, now);
      thock.frequency.exponentialRampToValueAtTime(48, now + 0.035);

      const thockGain = ctx.createGain();
      thockGain.gain.setValueAtTime(0.065, now);
      thockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      thock.connect(thockGain);
      thockGain.connect(ctx.destination);
      thock.start(now);
      thock.stop(now + 0.038);
    } else {
      // Regular character: crisp single button click
      // 1. Mechanical contact click (2100Hz short 8ms click)
      const click = ctx.createOscillator();
      click.type = "sine";
      click.frequency.setValueAtTime(2100, now);
      click.frequency.exponentialRampToValueAtTime(900, now + 0.008);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.07, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

      click.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(now);
      click.stop(now + 0.01);

      // 2. Warm switch body (180Hz -> 62Hz over 28ms at gain 0.07)
      const body = ctx.createOscillator();
      body.type = "triangle";
      body.frequency.setValueAtTime(180, now);
      body.frequency.exponentialRampToValueAtTime(62, now + 0.028);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.07, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      body.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      body.start(now);
      body.stop(now + 0.03);
    }
  } catch (err) {}
}

/**
 * Triggered when removing 1 character right-to-left.
 * Softer, slightly lower-pitched mechanical release click (1450Hz 7ms transient + 140Hz -> 50Hz decay over 24ms at gain 0.055)
 */
export function playRemoveCharSound(char) {
