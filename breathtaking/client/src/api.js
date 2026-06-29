const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  getMuscleGroups: () => request('/muscle-groups'),
  getExercises: (muscleGroup) =>
    request(`/exercises${muscleGroup ? `?muscle_group=${encodeURIComponent(muscleGroup)}` : ''}`),
  addExercise: (name, muscleGroup) =>
    request('/exercises', {
      method: 'POST',
      body: JSON.stringify({ name, muscle_group: muscleGroup }),
    }),
  deleteExercise: (id) => request(`/exercises/${id}`, { method: 'DELETE' }),
  logSet: (payload) =>
    request('/sets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getHistory: (limit = 50) => request(`/sets?limit=${limit}`),
  deleteSet: (id) => request(`/sets/${id}`, { method: 'DELETE' }),
  clearHistory: () => request('/sets', { method: 'DELETE' }),
  getTodayStats: () => request('/stats/today'),
};
