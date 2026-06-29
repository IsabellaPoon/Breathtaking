import './RestTimer.css';

// Purely presentational — all the actual countdown state (end time, paused, total) lives in
// App.jsx so the timer keeps running even while you're looking at a different tab. This also
// means the countdown is computed from real timestamps rather than a tick counter, so it stays
// accurate even if the browser throttles background work (e.g. screen locked at the gym).
export default function RestTimer({ secondsLeft, totalSeconds, paused, done, onAdjust, onTogglePause, onComplete, onSkip }) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  return (
    <div className="rest">
      <p className="rest__label">{done ? "Time's up!" : 'Taking a breather'}</p>

      <div className="rest__dial" style={{ '--progress': progress }}>
        <span className="rest__time">
          {mins}:{String(secs).padStart(2, '0')}
        </span>
      </div>

      <p className="rest__hint">
        {done
          ? "You're recovered and ready — hop back in whenever you feel good."
          : 'Nice and easy — slow breath in, slower breath out.'}
      </p>

      {!done && (
        <div className="rest__controls">
          <button onClick={() => onAdjust(-15)}>−15s</button>
          <button onClick={onTogglePause}>{paused ? 'Resume' : 'Pause'}</button>
          <button onClick={() => onAdjust(15)}>+15s</button>
        </div>
      )}

      <div className="rest__actions">
        {!done && (
          <button className="rest__skip" onClick={onSkip}>
            I'm good, skip ahead
          </button>
        )}
        {done && (
          <button className="rest__continue" onClick={onComplete}>
            Let's keep going
          </button>
        )}
      </div>
    </div>
  );
}
