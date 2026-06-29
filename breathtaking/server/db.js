const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'gym.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    is_custom INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    reps_target INTEGER NOT NULL,
    reps_completed INTEGER NOT NULL,
    duration_seconds REAL,
    rest_seconds INTEGER,
    completed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
  );
`);

const seedData = [
  // Chest
  ['Barbell Bench Press', 'Chest'],
  ['Incline Dumbbell Press', 'Chest'],
  ['Push-Up', 'Chest'],
  ['Cable Fly', 'Chest'],
  ['Dumbbell Chest Press', 'Chest'],
  // Back
  ['Deadlift', 'Back'],
  ['Pull-Up', 'Back'],
  ['Bent-Over Barbell Row', 'Back'],
  ['Lat Pulldown', 'Back'],
  ['Seated Cable Row', 'Back'],
  // Legs
  ['Barbell Back Squat', 'Legs'],
  ['Romanian Deadlift', 'Legs'],
  ['Walking Lunge', 'Legs'],
  ['Leg Press', 'Legs'],
  ['Leg Curl', 'Legs'],
  ['Calf Raise', 'Legs'],
  // Shoulders
  ['Overhead Barbell Press', 'Shoulders'],
  ['Dumbbell Lateral Raise', 'Shoulders'],
  ['Arnold Press', 'Shoulders'],
  ['Face Pull', 'Shoulders'],
  // Arms
  ['Barbell Curl', 'Arms'],
  ['Hammer Curl', 'Arms'],
  ['Tricep Pushdown', 'Arms'],
  ['Skull Crusher', 'Arms'],
  ['Dips', 'Arms'],
  // Core
  ['Plank', 'Core'],
  ['Hanging Leg Raise', 'Core'],
  ['Cable Woodchopper', 'Core'],
  ['Sit-Up', 'Core'],
];

const countRow = db.prepare('SELECT COUNT(*) AS c FROM exercises').get();
if (countRow.c === 0) {
  const insert = db.prepare('INSERT INTO exercises (name, muscle_group, is_custom) VALUES (?, ?, 0)');
  for (const [name, group] of seedData) {
    insert.run(name, group);
  }
}

module.exports = db;
