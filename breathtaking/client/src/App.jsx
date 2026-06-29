import { useEffect, useRef, useState } from 'react';
import NavBar from './components/NavBar';
import ExercisePicker from './components/ExercisePicker';
import BreathingRing from './components/BreathingRing';
import RestTimer from './components/RestTimer';
import HistoryPanel from './components/HistoryPanel';
import { audioCues } from './audioCues';
import { api } from './api';
import './App.css';

const DEFAULT_REST_SECONDS = 120;

function readStoredAudioPreference() {
  try {
    const stored = window.localStorage.getItem('breathtaking:audioCuesEnabled');
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function readStoredSpeedPreference() {
  try {
    const stored = window.localStorage.getItem('breathtaking:breathingSpeed');
    return stored === null ? 'normal' : stored;
  } catch {
    return 'normal';
  }
}

// Train sub-states: 'setup' -> 'active' -> 'resting' -> back to 'setup'
function App() {
  const [view, setView] = useState('train');
  const [trainStage, setTrainStage] = useState('setup');
  const [activeExercise, setActiveExercise] = useState(null);
  const [activeRepsTarget, setActiveRepsTarget] = useState(null);
  const [lastSetSummary, setLastSetSummary] = useState(null);
  const [logError, setLogError] = useState('');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(readStoredAudioPreference);
  const [breathingSpeed, setBreathingSpeed] = useState(readStoredSpeedPreference);

  // Rest timer state lives here (not inside RestTimer) and stays mounted regardless of which
  // tab is showing, so switching to History doesn't pause or reset the countdown. It's driven
  // by a real end-timestamp rather than a tick counter, so it also stays accurate if the
  // browser throttles background work (e.g. screen locked).
  const [restEndAt, setRestEndAt] = useState(null); // epoch ms the rest period ends at
  const [restTotalSeconds, setRestTotalSeconds] = useState(DEFAULT_REST_SECONDS);
  const [restPausedRemaining, setRestPausedRemaining] = useState(null); // seconds left, while paused
  const [restSecondsLeft, setRestSecondsLeft] = useState(DEFAULT_REST_SECONDS);
  const [restDone, setRestDone] = useState(false);
  const restChimePlayedRef = useRef(false);

  const resting = trainStage === 'resting';
  const restPaused = restPausedRemaining !== null;

  // Tick the countdown once a second whenever a rest period is active and not paused —
  // this effect runs at the App level so it keeps going no matter which tab is on screen.
  useEffect(() => {
    if (!resting || restPaused || restDone || restEndAt == null) return;
    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((restEndAt - Date.now()) / 1000));
      setRestSecondsLeft(secondsLeft);
      if (secondsLeft <= 0) setRestDone(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [resting, restPaused, restDone, restEndAt]);

  // Fire the completion chime/vibration exactly once per rest period.
  useEffect(() => {
    if (!restDone) {
      restChimePlayedRef.current = false;
      return;
    }
    if (restChimePlayedRef.current) return;
    restChimePlayedRef.current = true;
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if (audioEnabled) audioCues.restComplete();
  }, [restDone, audioEnabled]);

  function startRest(seconds = DEFAULT_REST_SECONDS) {
    setRestTotalSeconds(seconds);
    setRestSecondsLeft(seconds);
    setRestEndAt(Date.now() + seconds * 1000);
    setRestPausedRemaining(null);
    setRestDone(false);
  }

  function adjustRest(deltaSeconds) {
    if (restPaused) {
      setRestPausedRemaining((s) => Math.max(0, s + deltaSeconds));
      setRestTotalSeconds((t) => Math.max(t, restPausedRemaining + deltaSeconds));
      return;
    }
    setRestEndAt((end) => (end == null ? end : end + deltaSeconds * 1000));
    setRestTotalSeconds((t) => Math.max(t, restSecondsLeft + deltaSeconds));
  }

  function toggleRestPause() {
    if (restPaused) {
      // Resuming: pick a fresh end-time based on whatever time was left when paused.
      setRestEndAt(Date.now() + restPausedRemaining * 1000);
      setRestSecondsLeft(restPausedRemaining);
      setRestPausedRemaining(null);
    } else {
      setRestPausedRemaining(restSecondsLeft);
      setRestEndAt(null);
    }
  }

  function endRest() {
    setRestEndAt(null);
    setRestPausedRemaining(null);
    setRestDone(false);
    setTrainStage('setup');
    setActiveExercise(null);
    setActiveRepsTarget(null);
  }

  function toggleAudio() {
    setAudioEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('breathtaking:audioCuesEnabled', String(next));
      } catch {
        // Storage not available — preference just won't stick around next time.
      }
      return next;
    });
  }

  function changeBreathingSpeed(speed) {
    setBreathingSpeed(speed);
    try {
      window.localStorage.setItem('breathtaking:breathingSpeed', speed);
    } catch {
      // Storage not available — preference just won't stick around next time.
    }
  }

  function handleStart({ exercise, repsTarget }) {
    setActiveExercise(exercise);
    setActiveRepsTarget(repsTarget);
    setLogError('');
    setTrainStage('active');
  }

  async function handleSetFinished({ repsCompleted, durationSeconds }) {
    try {
      await api.logSet({
        exercise_id: activeExercise.id,
        reps_target: activeRepsTarget,
        reps_completed: repsCompleted,
        duration_seconds: durationSeconds,
        rest_seconds: DEFAULT_REST_SECONDS,
      });
      setLastSetSummary({ repsCompleted, repsTarget: activeRepsTarget });
      setHistoryRefreshKey((k) => k + 1);
      setTrainStage('resting');
      startRest();
    } catch (err) {
      setLogError(err.message);
      // Even if logging fails, let them rest — don't block recovery on a network hiccup.
      setTrainStage('resting');
      startRest();
    }
  }

  function handleCancelSet() {
    setTrainStage('setup');
    setActiveExercise(null);
    setActiveRepsTarget(null);
  }

  return (
    <div className="app">
      <NavBar view={view} onNavigate={setView} resting={resting} />

      <main className="app__main">
        {view === 'train' && (
          <div className="app__panel">
            {trainStage === 'setup' && (
              <>
                <header className="app__intro">
                  <h1>Ready when you are!</h1>
                  <p>Choose what you're working on, set your reps, and we'll breathe through it together.</p>
                </header>
                {logError && (
                  <p className="app__warning">
                    Hmm, that last set didn't save to your history — but nice work all the same. ({logError})
                  </p>
                )}
                <ExercisePicker onStart={handleStart} />
              </>
            )}

            {trainStage === 'active' && activeExercise && (
              <BreathingRing
                exercise={activeExercise}
                repsTarget={activeRepsTarget}
                audioEnabled={audioEnabled}
                onToggleAudio={toggleAudio}
                breathingSpeed={breathingSpeed}
                onChangeSpeed={changeBreathingSpeed}
                onFinish={handleSetFinished}
                onCancel={handleCancelSet}
              />
            )}

            {resting && (
              <>
                {lastSetSummary && (
                  <p className="app__set-summary">
                    Nice! {lastSetSummary.repsCompleted} of {lastSetSummary.repsTarget} reps in the books.
                  </p>
                )}
                <RestTimer
                  secondsLeft={restSecondsLeft}
                  totalSeconds={restTotalSeconds}
                  paused={restPaused}
                  done={restDone}
                  onAdjust={adjustRest}
                  onTogglePause={toggleRestPause}
                  onComplete={endRest}
                  onSkip={endRest}
                />
              </>
            )}
          </div>
        )}

        {view === 'history' && (
          <div className="app__panel" key={historyRefreshKey}>
            <header className="app__intro">
              <h1>Your progress</h1>
              <p>Every set you've finished, most recent first.</p>
            </header>
            {resting && (
              <button type="button" className="app__rest-banner" onClick={() => setView('train')}>
                <span className="app__rest-banner-dot" aria-hidden="true" />
                {restDone
                  ? "Rest's done — tap to keep going"
                  : `Resting — ${formatClock(restSecondsLeft)} left, tap to view`}
              </button>
            )}
            <HistoryPanel onCleared={() => setHistoryRefreshKey((k) => k + 1)} />
          </div>
        )}
      </main>
    </div>
  );
}

function formatClock(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default App;
