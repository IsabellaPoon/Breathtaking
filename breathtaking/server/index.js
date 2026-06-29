const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// --- Exercises ---

// List all exercises, optionally filtered by muscle group
app.get('/api/exercises', (req, res) => {
  const { muscle_group } = req.query;
  let rows;
  if (muscle_group) {
    rows = db
      .prepare('SELECT * FROM exercises WHERE muscle_group = ? ORDER BY is_custom ASC, name ASC')
      .all(muscle_group);
  } else {
    rows = db.prepare('SELECT * FROM exercises ORDER BY muscle_group ASC, is_custom ASC, name ASC').all();
  }
  res.json(rows);
});

// Distinct muscle groups, in a sensible fixed order with any custom groups appended
app.get('/api/muscle-groups', (req, res) => {
  const preferredOrder = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
  const rows = db.prepare('SELECT DISTINCT muscle_group FROM exercises').all();
  const found = rows.map((r) => r.muscle_group);
  const ordered = preferredOrder.filter((g) => found.includes(g));
  const extra = found.filter((g) => !preferredOrder.includes(g)).sort();
  res.json([...ordered, ...extra]);
});

// Add a custom exercise
app.post('/api/exercises', (req, res) => {
  const { name, muscle_group } = req.body;
  if (!name || !name.trim() || !muscle_group || !muscle_group.trim()) {
    return res.status(400).json({ error: 'Exercise name and muscle group are both required.' });
  }
  const existing = db
    .prepare('SELECT * FROM exercises WHERE name = ? COLLATE NOCASE AND muscle_group = ? COLLATE NOCASE')
    .get(name.trim(), muscle_group.trim());
  if (existing) {
    return res.status(409).json({ error: 'That exercise already exists in this muscle group.' });
  }
  const result = db
    .prepare('INSERT INTO exercises (name, muscle_group, is_custom) VALUES (?, ?, 1)')
    .run(name.trim(), muscle_group.trim());
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// Delete a custom exercise (seeded ones are protected)
app.delete('/api/exercises/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Exercise not found.' });
  if (!row.is_custom) {
    return res.status(403).json({ error: 'Built-in exercises can\u2019t be deleted.' });
  }
  db.prepare('DELETE FROM exercises WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Sets (workout log) ---

// Log a completed set
app.post('/api/sets', (req, res) => {
  const { exercise_id, reps_target, reps_completed, duration_seconds, rest_seconds } = req.body;
  if (!exercise_id || reps_target == null || reps_completed == null) {
    return res.status(400).json({ error: 'exercise_id, reps_target, and reps_completed are required.' });
  }
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exercise_id);
  if (!exercise) return res.status(404).json({ error: 'Exercise not found.' });

  const result = db
    .prepare(
      `INSERT INTO sets (exercise_id, reps_target, reps_completed, duration_seconds, rest_seconds)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(exercise_id, reps_target, reps_completed, duration_seconds ?? null, rest_seconds ?? null);

  const row = db.prepare('SELECT * FROM sets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// Recent history, with exercise name joined in
app.get('/api/sets', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const rows = db
    .prepare(
      `SELECT sets.*, exercises.name AS exercise_name, exercises.muscle_group
       FROM sets
       JOIN exercises ON exercises.id = sets.exercise_id
       ORDER BY sets.completed_at DESC
       LIMIT ?`
    )
    .all(limit);
  res.json(rows);
});

// Remove a single set from the log
app.delete('/api/sets/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sets WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: "Couldn't find that entry." });
  db.prepare('DELETE FROM sets WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Clear the entire workout log
app.delete('/api/sets', (req, res) => {
  db.exec('DELETE FROM sets');
  res.json({ ok: true });
});

// Today's set count + total reps, for a small stats strip
app.get('/api/stats/today', (req, res) => {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS sets_today, COALESCE(SUM(reps_completed), 0) AS reps_today
       FROM sets
       WHERE date(completed_at) = date('now')`
    )
    .get();
  res.json(row);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Gym app API listening on port ${PORT}`);
});
