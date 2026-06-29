// Lightweight tone synthesizer for in-app audio cues.
//
// A note on "won't interrupt Spotify": there's no web API that can guarantee this on every
// device — once a browser tab plays any audio, the OS may briefly duck or interrupt other
// apps' playback, and that behavior is controlled by the OS/browser, not by us. What we *can*
// do from here is keep cues very short, keep them quiet, and make them easy to mute entirely
// — which is what this module and the mute toggle in the UI are for.

let sharedCtx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) sharedCtx = new AudioCtx();
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

/**
 * Play a brief, soft sine tone.
 * @param {number} frequency - tone pitch in Hz
 * @param {number} durationMs - how long the tone rings out
 * @param {number} peakVolume - 0–1, kept low by default to stay unobtrusive
 */
function playTone(frequency, durationMs = 220, peakVolume = 0.06) {
  try {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;

    const now = ctx.currentTime;
    const durationSec = durationMs / 1000;
    // Quick fade in/out avoids audible clicks and keeps the cue feeling soft.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakVolume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  } catch {
    // Audio not available in this environment — fail silently, cues are a bonus, not required.
  }
}

export const audioCues = {
  // Rising, gentle tone for inhale.
  inhale: () => playTone(392, 260, 0.05), // G4
  // Slightly lower, a touch firmer for exhale (the exertion phase).
  exhale: () => playTone(294, 200, 0.06), // D4
  // Brighter double-tone when rest finishes.
  restComplete: () => {
    playTone(523, 160, 0.07); // C5
    setTimeout(() => playTone(659, 220, 0.07), 140); // E5
  },
};
