// Shared by every page: token storage, API calls, nav Sign In / Sign Out
const Auth = {
  get token() { return localStorage.getItem('wt_token'); },
  set(token, user) { localStorage.setItem('wt_token', token); localStorage.setItem('wt_user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('wt_token'); localStorage.removeItem('wt_user'); }
};

async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (Auth.token) headers.Authorization = 'Bearer ' + Auth.token;

  let res;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30000);
  try {
    res = await fetch('/api' + path, { method, headers, signal: ctl.signal, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    throw new Error(e.name === 'AbortError'
      ? 'The server took too long to respond. The API may be waking up, so try again in a moment.'
      : "Can't reach the website server. Check your internet connection and try again.");
  } finally { clearTimeout(timer); }
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && Auth.token) { Auth.clear(); goToLogin(); }   // expired session
  if (!res.ok) throw new Error(data.error || explain(res.status));
  return data;
}

// Plain-English reasons when the response has no message of its own
function explain(status) {
  if (status === 401 || status === 403) return 'The website could not authenticate to the API. Check the FUNCTION_KEY setting on the Web App.';
  if (status === 404) return 'API not found. Check FUNCTION_APP_URL on the Web App and that the Function App is deployed.';
  if (status >= 500) return 'The API is not responding (error ' + status + '). Check the Function App settings and its logs.';
  return 'Request failed (error ' + status + ').';
}

function goToLogin() {
  location.href = 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'home.html');
}
function requireLogin() { if (!Auth.token) { goToLogin(); return false; } return true; }

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function say(text, isError) {
  const m = document.getElementById('message');
  if (!m) return;
  m.textContent = text;
  m.classList.toggle('error', !!isError);
}

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('nav');
  if (nav) {
    nav.querySelectorAll('a[href="login.html"]').forEach((a) => a.remove());
    const a = document.createElement('a');
    if (Auth.token) {
      a.href = '#'; a.textContent = 'Sign Out';
      a.addEventListener('click', (e) => { e.preventDefault(); Auth.clear(); location.href = 'home.html'; });
    } else { a.href = 'login.html'; a.textContent = 'Sign In'; }
    nav.appendChild(a);
  }
  // Home page "Get Started" goes straight to the builder when already signed in
  const start = document.querySelector('.hero a[href="login.html"]');
  if (start && Auth.token) start.href = 'workout_builder.html';
});
