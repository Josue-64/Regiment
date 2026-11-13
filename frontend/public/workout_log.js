const $ = (id) => document.getElementById(id);
let rows = [];   // { exercise, last, weight, sets, reps, alts }

function renderRows() {
  $('logList').innerHTML = rows.map((r, i) => `
    <div class="logRow" data-i="${i}">
      <div class="exerciseName">${esc(r.exercise.name)}</div>
      <div class="exerciseDetails">${esc([r.exercise.muscle, r.exercise.machine].filter(Boolean).join(' · '))}</div>
      ${r.last ? `<div class="exerciseDetails">Last time: ${r.last.weight} × ${r.last.sets} sets × ${r.last.reps} reps</div>` : ''}
      <div class="logInputs">
        <label class="logField"><span>Weight</span><input type="number" min="0" step="any" data-f="weight" value="${esc(r.weight)}"></label>
        <label class="logField"><span>Sets</span><input type="number" min="0" step="1" data-f="sets" value="${esc(r.sets)}"></label>
        <label class="logField"><span>Reps</span><input type="number" min="0" step="1" data-f="reps" value="${esc(r.reps)}"></label>
      </div>
      <button type="button" class="smallBtn removeBtn" data-swap="${i}" style="margin-top:8px">Machine busy? Swap</button>
      ${r.alts ? `<div class="altRow">${r.alts.length
        ? r.alts.map((a) => `<button type="button" class="smallBtn" data-pick="${i}:${a.id}">${esc(a.name)}${a.machine ? ' (' + esc(a.machine) + ')' : ''}</button>`).join('')
        : '<span class="exerciseDetails">No alternatives found.</span>'}</div>` : ''}
    </div>`).join('');
}

// Keep typed values in memory so re-rendering never wipes them
$('logList').addEventListener('input', (ev) => {
  const f = ev.target.dataset.f;
  if (f) rows[Number(ev.target.closest('.logRow').dataset.i)][f] = ev.target.value;
});

$('logList').addEventListener('click', async (ev) => {
  const { swap, pick } = ev.target.dataset;
  try {
    if (swap !== undefined) {
      const r = rows[Number(swap)];
      r.alts = await api(`/exercises/${r.exercise.id}/alternatives`);
      renderRows();
    } else if (pick) {
      const [i, id] = pick.split(':').map(Number);
      const alt = rows[i].alts.find((a) => a.id === id);
      rows[i] = { exercise: alt, last: null, weight: '', sets: '', reps: '', alts: null };
      renderRows();
    }
  } catch (e) { say(e.message, true); }
});

async function loadWorkout() {
  const id = $('workoutSelect').value;
  if (!id) return;
  try {
    const [w, last] = await Promise.all([api('/workouts/' + id), api(`/workouts/${id}/last`)]);
    rows = w.exercises.map((exercise) => ({
      exercise, last: last.find((l) => l.exerciseId === exercise.id) || null,
      weight: '', sets: '', reps: '', alts: null }));
    renderRows();
  } catch (e) { say(e.message, true); }
}

async function loadPast() {
  try {
    const logs = await api('/logs');
    $('pastList').innerHTML = logs.length ? logs.map((l) => `
      <div class="pastWorkout">
        <div class="pastHeader"><strong>${esc(l.workoutName)}</strong><span class="exerciseDetails">${new Date(l.loggedAt).toLocaleDateString()}</span></div>
        ${l.entries.map((e) => `<div class="pastLine">${esc(e.exercise)}: ${e.weight} × ${e.sets} × ${e.reps}</div>`).join('')}
      </div>`).join('') : '<p class="exerciseDetails">Nothing logged yet.</p>';
  } catch (e) { say(e.message, true); }
}

$('workoutSelect').addEventListener('change', loadWorkout);

$('logBtn').addEventListener('click', async () => {
  const entries = rows.filter((r) => r.weight !== '' && r.sets !== '' && r.reps !== '')
    .map((r) => ({ exerciseId: r.exercise.id, weight: r.weight, sets: r.sets, reps: r.reps }));
  if (!entries.length) return say('Fill in weight, sets and reps for at least one exercise.', true);
  try {
    await api('/logs', { method: 'POST', body: { workoutId: Number($('workoutSelect').value), entries } });
    say('Workout logged. Nice work!');
    await Promise.all([loadWorkout(), loadPast()]);
  } catch (e) { say(e.message, true); }
});

async function init() {
  try {
    const workouts = await api('/workouts');
    if (!workouts.length) {
      $('workoutSelect').hidden = true; $('logBtn').hidden = true;
      $('logList').innerHTML = '<p class="exerciseDetails">No workouts yet. <a href="workout_builder.html" style="color:#569cd6">Build one first</a>.</p>';
    } else {
      $('workoutSelect').innerHTML = workouts.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join('');
      await loadWorkout();
    }
    loadPast();
  } catch (e) { say(e.message, true); }
}

if (requireLogin()) init();
