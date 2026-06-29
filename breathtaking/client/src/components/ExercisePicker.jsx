import { useEffect, useState } from 'react';
import { api } from '../api';
import './ExercisePicker.css';

export default function ExercisePicker({ onStart }) {
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [exercises, setExercises] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [reps, setReps] = useState(10);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMuscleGroups()
      .then((groups) => {
        setMuscleGroups(groups);
        if (groups.length) setSelectedGroup(groups[0]);
      })
      .catch(() => setFormError("Hmm, we couldn't reach the server — is it running?"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    api.getExercises(selectedGroup).then((list) => {
      setExercises(list);
      setSelectedExerciseId(list.length ? String(list[0].id) : '');
    });
  }, [selectedGroup]);

  async function handleAddExercise(e) {
    e.preventDefault();
    setFormError('');
    if (!newName.trim()) {
      setFormError('Mind giving it a name first?');
      return;
    }
    try {
      const created = await api.addExercise(newName.trim(), selectedGroup);
      const list = await api.getExercises(selectedGroup);
      setExercises(list);
      setSelectedExerciseId(String(created.id));
      setNewName('');
      setShowAddForm(false);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteExercise(id);
      const list = await api.getExercises(selectedGroup);
      setExercises(list);
      setSelectedExerciseId(list.length ? String(list[0].id) : '');
    } catch (err) {
      setFormError(err.message);
    }
  }

  const selectedExercise = exercises.find((ex) => String(ex.id) === selectedExerciseId);

  function handleStart() {
    if (!selectedExercise) return;
    if (!reps || reps < 1) {
      setFormError("How many reps are you going for? Just pop a number in there.");
      return;
    }
    onStart({ exercise: selectedExercise, repsTarget: Number(reps) });
  }

  if (loading) {
    return <p className="picker__status">Just a moment, getting your exercises ready…</p>;
  }

  return (
    <div className="picker">
      <div className="picker__row">
        <label className="picker__field">
          <span className="picker__label">Muscle group</span>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
            {muscleGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="picker__field picker__field--grow">
          <span className="picker__label">Exercise</span>
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            disabled={!exercises.length}
          >
            {exercises.length === 0 && <option>Nothing here yet — add one below!</option>}
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
                {ex.is_custom ? ' (yours)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="picker__field picker__field--reps">
          <span className="picker__label">Reps</span>
          <input
            type="number"
            min="1"
            max="999"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </label>
      </div>

      {Boolean(selectedExercise?.is_custom) && (
        <button
          type="button"
          className="picker__remove"
          onClick={() => handleDelete(selectedExercise.id)}
        >
          Remove this one
        </button>
      )}

      {!showAddForm ? (
        <button type="button" className="picker__add-toggle" onClick={() => setShowAddForm(true)}>
          + Don't see it? Add your own
        </button>
      ) : (
        <form className="picker__add-form" onSubmit={handleAddExercise}>
          <input
            type="text"
            placeholder={`What's it called? (${selectedGroup.toLowerCase()})`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="picker__add-actions">
            <button type="submit" className="picker__add-save">
              Add it
            </button>
            <button
              type="button"
              className="picker__add-cancel"
              onClick={() => {
                setShowAddForm(false);
                setNewName('');
                setFormError('');
              }}
            >
              Never mind
            </button>
          </div>
        </form>
      )}

      {formError && <p className="picker__error">{formError}</p>}

      <button
        type="button"
        className="picker__start"
        onClick={handleStart}
        disabled={!selectedExercise}
      >
        Let's go!
      </button>
    </div>
  );
}
