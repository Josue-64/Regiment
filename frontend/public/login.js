const $ = (id) => document.getElementById(id);
let registering = false;

// Only allow redirects to our own pages
const nextParam = new URLSearchParams(location.search).get('next');
const nextPage = /^[a-z_]+\.html$/.test(nextParam || '') ? nextParam : 'workout_builder.html';

if (Auth.token) location.href = nextPage;

function setMode(reg) {
  registering = reg;
  $('formTitle').textContent = reg ? 'Create Account' : 'Sign In';
  $('submitBtn').textContent = reg ? 'Create Account' : 'Sign In';
  $('toggleBtn').textContent = reg ? 'Have an account? Sign in' : 'No account? Create one';
  $('displayName').hidden = !reg;
  $('password').autocomplete = reg ? 'new-password' : 'current-password';
  say('');
}

async function submit() {
  const body = { username: $('username').value, password: $('password').value };
  if (registering) body.displayName = $('displayName').value;
  $('submitBtn').disabled = true;
  say(registering ? 'Creating your account...' : 'Signing in...');
  try {
    const data = await api(registering ? '/auth/register' : '/auth/login', { method: 'POST', body });
    Auth.set(data.token, data.user);
    location.href = nextPage;
  } catch (e) {
    say(e.message, true);
    $('submitBtn').disabled = false;
  }
}

$('submitBtn').addEventListener('click', submit);
$('toggleBtn').addEventListener('click', () => setMode(!registering));
$('password').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
