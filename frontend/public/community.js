const $ = (id) => document.getElementById(id);
const COLORS = ['#dd840f', '#6644a8', '#db6724', '#e6b800', '#2e8b6e', '#b03a5b'];

function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

function ago(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  if (mins < 1440) return Math.floor(mins / 60) + ' hours ago';
  const days = Math.floor(mins / 1440);
  return days === 1 ? 'Yesterday' : days + ' days ago';
}

const likeLabel = (liked, n) => `${liked ? '♥' : '♡'} ${n}`;

function postHtml(p) {
  return `
    <article class="post">
      <div class="postTop">
        <div class="avatar" style="background-color: ${colorFor(p.username)};">${esc((p.displayName || '?')[0].toUpperCase())}</div>
        <div>
          <span class="postAuthor">${esc(p.displayName)}</span>
          <div class="postTime">${ago(p.createdAt)}</div>
        </div>
      </div>
      <h3 class="postTitle">${esc(p.title)}</h3>
      <ul class="postExercises">${p.exercises.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      ${p.note ? `<p class="postNote">${esc(p.note)}</p>` : ''}
      <button type="button" class="smallBtn likeBtn${p.likedByMe ? ' liked' : ''}" data-like="${p.id}">${likeLabel(p.likedByMe, p.likes)}</button>
    </article>`;
}

async function loadFeed() {
  try {
    const q = $('searchBar').value.trim();
    const posts = await api('/posts' + (q ? '?q=' + encodeURIComponent(q) : ''));
    $('feed').innerHTML = posts.length ? posts.map(postHtml).join('')
      : '<p class="message">No workouts found. Be the first to share one!</p>';
  } catch (e) { say(e.message, true); }
}

$('feed').addEventListener('click', async (ev) => {
  const id = ev.target.dataset.like;
  if (!id) return;
  if (!requireLogin()) return;
  try {
    const r = await api(`/posts/${id}/like`, { method: 'POST' });
    ev.target.classList.toggle('liked', r.liked);
    ev.target.textContent = likeLabel(r.liked, r.likes);
  } catch (e) { say(e.message, true); }
});

$('shareBtn').addEventListener('click', async () => {
  if (!requireLogin()) return;
  try {
    await api('/posts', { method: 'POST', body: {
      title: $('shareTitle').value, exercises: $('shareExercises').value, note: $('shareNote').value } });
    ['shareTitle', 'shareExercises', 'shareNote'].forEach((id) => ($(id).value = ''));
    say('Shared!');
    loadFeed();
  } catch (e) { say(e.message, true); }
});

let timer;
$('searchBar').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(loadFeed, 250); });

loadFeed();
