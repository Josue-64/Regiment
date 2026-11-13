const $ = (id) => document.getElementById(id);
let routine = [];
let catalog = [];

const details = (e) => [e.muscle, e.machine, e.grip].filter(Boolean).join(' · ');

async function loadCatalog() {
  const p = new URLSearchParams({ muscle: $('muscleFilter').value });
  if ($('searchBox').value.trim()) p.set('q', $('searchBox').value.trim());
  try { catalog = await api('/exercises?' + p); renderCatalog(); }
  catch (e) { say(e.message, true); }
}

function renderCatalog() {
  $('catalogList').innerHTML = catalog.length
    ? catalog.map((e) => `
        <div class="exerciseItem">
          <div><div class="exerciseName">${esc(e.name)}</div><div class="exerciseDetails">${esc(details(e))}</div></div>
          <button type="button" class="smallBtn" data-add="${e.id}">Add</button>
        </div>`).join('')
    : '<p class="exerciseDetails">No exercises found.</p>';
}

function renderRoutine() {
  $('routineList').innerHTML = routine.length
    ? routine.map((e, i) => `
        <div class="exerciseItem">
          <div><div class="exerciseName">${esc(e.name)}</div><div class="exerciseDetails">${esc(details(e))}</div></div>
          <button type="button" class="smallBtn removeBtn" data-remove="${i}">Remove</button>
        </div>`).join('')
    : '<p class="exerciseDetails">Add exercises from the catalog.</p>';
}

$('catalogList').addEventListener('click', (ev) => {
  const id = ev.target.dataset.add;
  if (!id) return;
  const ex = catalog.find((e) => e.id === Number(id));
  if (routine.some((r) => r.id === ex.id)) return say(ex.name + ' is already in your workout.', true);
  routine.push(ex); renderRoutine(); say('');
});

$('routineList').addEventListener('click', (ev) => {
  if (ev.target.dataset.remove === undefined) return;
  routine.splice(Number(ev.target.dataset.remove), 1); renderRoutine();
});

let timer;
$('searchBox').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(loadCatalog, 250); });
$('muscleFilter').addEventListener('change', loadCatalog);

$('customBtn').addEventListener('click', async () => {
  try {
    await api('/exercises', { method: 'POST', body: {
      name: $('customName').value, machine: $('customMachine').value,
      grip: $('customGrip').value, muscle: $('customMuscle').value } });
    ['customName', 'customMachine', 'customGrip'].forEach((id) => ($(id).value = ''));
    say('Custom exercise added to your catalog.');
    loadCatalog();
  } catch (e) { say(e.message, true); }
});

$('saveBtn').addEventListener('click', async () => {
  try {
    await api('/workouts', { method: 'POST', body: { name: $('workoutName').value, exerciseIds: routine.map((e) => e.id) } });
    say(`Saved "${$('workoutName').value.trim()}". Open the Workout Log to track it.`);
    $('workoutName').value = ''; routine = []; renderRoutine();
  } catch (e) { say(e.message, true); }
});

if (requireLogin()) { renderRoutine(); loadCatalog(); }
