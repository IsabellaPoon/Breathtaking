import { useEffect, useState } from 'react';
import { api } from '../api';
import './HistoryPanel.css';

export default function HistoryPanel({ onCleared }) {
  const [sets, setSets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    Promise.all([api.getHistory(100), api.getTodayStats()])
      .then(([history, todayStats]) => {
        setSets(history);
        setStats(todayStats);
        setError('');
      })
      .catch(() => setError("Hmm, we couldn't load your history just now."))
      .finally(() => setLoading(false));
  }

  async function handleDeleteOne(id) {
    try {
      await api.deleteSet(id);
      setSets((prev) => prev.filter((s) => s.id !== id));
      const todayStats = await api.getTodayStats();
      setStats(todayStats);
    } catch {
      setError("That entry didn't want to budge — give it another try.");
    }
  }

  async function handleClearAll() {
    setClearing(true);
    try {
      await api.clearHistory();
      setSets([]);
      setStats({ sets_today: 0, reps_today: 0 });
      setConfirmingClear(false);
      onCleared?.();
    } catch {
      setError("Couldn't clear your history just now — mind trying again?");
    } finally {
      setClearing(false);
    }
  }

  if (loading) return <p className="history__status">Pulling up your history…</p>;
  if (error) return <p className="history__status history__status--error">{error}</p>;

  const groups = groupByDay(sets);

  return (
    <div className="history">
      <div className="history__stats">
        <div className="history__stat">
          <span className="history__stat-value">{stats.sets_today}</span>
          <span className="history__stat-label">Sets today</span>
        </div>
        <div className="history__stat">
          <span className="history__stat-value">{stats.reps_today}</span>
          <span className="history__stat-label">Reps today</span>
        </div>
      </div>

      {sets.length === 0 ? (
        <div className="history__empty">
          <p>Nothing here yet!</p>
          <p className="history__empty-sub">Finish a set on the Train tab and it'll show up here.</p>
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.key} className="history__day-group">
              <h2 className="history__day-heading">{group.label}</h2>
              <ul className="history__list">
                {group.items.map((s) => (
                  <li key={s.id} className="history__item">
                    <div className="history__item-main">
                      <span className="history__item-name">{s.exercise_name}</span>
                      <span className="history__item-group">{s.muscle_group}</span>
                    </div>
                    <div className="history__item-meta">
                      <span>
                        {s.reps_completed}/{s.reps_target} reps
                      </span>
                      {s.duration_seconds != null && <span>{Math.round(s.duration_seconds)}s</span>}
                      <span className="history__item-time">{formatTimeOnly(s.completed_at)}</span>
                    </div>
                    <button
                      type="button"
                      className="history__item-delete"
                      onClick={() => handleDeleteOne(s.id)}
                      aria-label={`Remove this ${s.exercise_name} entry`}
                      title="Remove this entry"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="history__clear-zone">
            {!confirmingClear ? (
              <button
                type="button"
                className="history__clear-trigger"
                onClick={() => setConfirmingClear(true)}
              >
                Clear my history
              </button>
            ) : (
              <div className="history__clear-confirm">
                <p>Clear all {sets.length} logged sets? This can't be undone.</p>
                <div className="history__clear-actions">
                  <button
                    type="button"
                    className="history__clear-confirm-btn"
                    onClick={handleClearAll}
                    disabled={clearing}
                  >
                    {clearing ? 'Clearing…' : 'Yes, clear it all'}
                  </button>
                  <button
                    type="button"
                    className="history__clear-cancel-btn"
                    onClick={() => setConfirmingClear(false)}
                    disabled={clearing}
                  >
                    Keep my history
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// SQLite's datetime('now') gives "YYYY-MM-DD HH:MM:SS" in UTC — parse it as such.
function parseUtc(isoLike) {
  const d = new Date(isoLike.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimeOnly(isoLike) {
  const d = parseUtc(isoLike);
  if (!d) return isoLike;
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) return 'Today';
  if (dayKey(date) === dayKey(yesterday)) return 'Yesterday';

  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}

// Groups already-sorted (most-recent-first) sets into day buckets, preserving order.
function groupByDay(sets) {
  const groups = [];
  const byKey = new Map();

  for (const s of sets) {
    const date = parseUtc(s.completed_at);
    const key = date ? dayKey(date) : 'unknown';
    if (!byKey.has(key)) {
      const group = { key, label: date ? dayLabel(date) : 'Earlier', items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).items.push(s);
  }

  return groups;
}
