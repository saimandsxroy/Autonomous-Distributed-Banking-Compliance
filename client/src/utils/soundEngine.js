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
