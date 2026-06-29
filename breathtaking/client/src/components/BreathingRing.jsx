import { useEffect, useRef, useState } from 'react';
import { audioCues } from '../audioCues';
import './BreathingRing.css';

// Three speed presets, each still keeping inhale a bit longer than exhale —
// the lowering part of a lift is naturally slower than the push/lift itself.
const SPEED_PRESETS = {
  slower: { inhaleMs: 3400, exhaleMs: 2100, label: 'Slower' },
  normal: { inhaleMs: 2600, exhaleMs: 1600, label: 'Normal' },
  faster: { inhaleMs: 1800, exhaleMs: 1100, label: 'Faster' },
};

export default function BreathingRing({
  exercise,
  repsTarget,
  audioEnabled,
  onToggleAudio,
  breathingSpeed = 'normal',
  onChangeSpeed,
  onFinish,
  onCancel,
}) {
  const [repsDone, setRepsDone] = useState(0);
  const [phase, setPhase] = useState('inhale'); // 'inhale' | 'exhale'
  const [running, setRunning] = useState(true);
  const startTimeRef = useRef(Date.now());
  const phaseTimerRef = useRef(null);

  const { inhaleMs, exhaleMs } = SPEED_PRESETS[breathingSpeed] || SPEED_PRESETS.normal;

  // Play a cue the moment we enter a phase (including the very first inhale).
  useEffect(() => {
    if (!audioEnabled || !running) return;
    if (phase === 'inhale') audioCues.inhale();
    else audioCues.exhale();
  }, [phase, running, audioEnabled]);

  useEffect(() => {
    if (!running) return;
    const duration = phase === 'inhale' ? inhaleMs : exhaleMs;
    phaseTimerRef.current = setTimeout(() => {
      if (phase === 'inhale') {
        setPhase('exhale');
      } else {
        // Completed one full inhale+exhale cycle = one rep
        setPhase('inhale');
        setRepsDone((r) => {
          const next = r + 1;
          if (next >= repsTarget) {
            setRunning(false);
          }
          return next;
        });
      }
    }, duration);
    return () => clearTimeout(phaseTimerRef.current);
  }, [phase, running, repsTarget, inhaleMs, exhaleMs]);

  function handleManualTick() {
    // Lets you tap to log a rep yourself, if your pace doesn't quite match the ring
    if (!running) return;
    setRepsDone((r) => {
      const next = Math.min(r + 1, repsTarget);
      if (next >= repsTarget) setRunning(false);
      return next;
    });
  }

  function handleDone() {
    const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
    onFinish({ repsCompleted: repsDone, durationSeconds });
  }

  const atTarget = repsDone >= repsTarget;
  const cueText = phase === 'inhale' ? 'Breathe in — lower it nice and easy' : 'Breathe out — push through';

  return (
    <div className="ring-screen">
      <div className="ring-screen__top">
        <p className="ring-screen__exercise">{exercise.name}</p>
        <button
          type="button"
          className="ring-screen__audio-toggle"
          onClick={onToggleAudio}
          aria-pressed={audioEnabled}
          aria-label={audioEnabled ? 'Mute breathing cues' : 'Unmute breathing cues'}
        >
          {audioEnabled ? '🔊 Cues on' : '🔇 Cues off'}
        </button>
      </div>

      <div className={`ring ring--${phase}`} onClick={handleManualTick} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleManualTick(); }}
        aria-label="Tap to log a rep yourself">
        <div className="ring__pulse" aria-hidden="true" />
        <div className="ring__core">
          <span className="ring__count">{repsDone}</span>
          <span className="ring__target">/ {repsTarget}</span>
        </div>
      </div>

      <p className={`ring-screen__cue ring-screen__cue--${phase}`}>
        {atTarget ? "You're all done with this set!" : cueText}
      </p>
      <p className="ring-screen__hint">
        {atTarget
          ? "Log it below and we'll start your rest time."
          : "We'll breathe through this one with you — tap the circle any time to count a rep yourself."}
      </p>
      
      {!atTarget && (
        <div className="ring-screen__speed">
          <span className="ring-screen__speed-label">Pace</span>
          <div className="ring-screen__speed-options">
            {Object.entries(SPEED_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                className={
                  breathingSpeed === key
                    ? 'ring-screen__speed-btn is-active'
                    : 'ring-screen__speed-btn'
                }
                onClick={() => onChangeSpeed?.(key)}
                aria-pressed={breathingSpeed === key}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ring-screen__actions">
        {!atTarget && (
          <button className="ring-screen__finish-early" onClick={handleDone}>
            Wrap up here ({repsDone} reps)
          </button>
        )}
        {atTarget && (
          <button className="ring-screen__finish" onClick={handleDone}>
            Log it & start resting
          </button>
        )}
        <button className="ring-screen__cancel" onClick={onCancel}>
          Never mind, cancel
        </button>
      </div>
    </div>
  );
}
