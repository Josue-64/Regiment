const { query } = require('../lib/db');
const { endpoint, fail } = require('../lib/http');

endpoint('listPosts', { methods: ['GET'], route: 'posts', auth: 'optional' }, async ({ user, query: q }) => {
  const rows = await query(
    `SELECT TOP 50 p.id, p.title, p.exercises, p.note, p.createdAt, u.username, u.displayName,
            (SELECT COUNT(*) FROM PostLikes WHERE postId = p.id) AS likes,
            CASE WHEN EXISTS (SELECT 1 FROM PostLikes WHERE postId = p.id AND userId = @uid) THEN 1 ELSE 0 END AS likedByMe
     FROM Posts p JOIN Users u ON u.id = p.userId
     WHERE @q IS NULL OR p.title LIKE '%'+@q+'%' OR p.exercises LIKE '%'+@q+'%'
        OR u.displayName LIKE '%'+@q+'%' OR u.username LIKE '%'+@q+'%'
     ORDER BY p.createdAt DESC`, { uid: user?.id ?? -1, q: q.q || null });
  return rows.map((r) => ({ ...r, exercises: JSON.parse(r.exercises), likedByMe: !!r.likedByMe }));
});

// { title, exercises: ["Back Squat", ...] or "a, b, c", note }
endpoint('createPost', { methods: ['POST'], route: 'posts' }, async ({ user, body }) => {
  const list = (Array.isArray(body.exercises) ? body.exercises : String(body.exercises || '').split(','))
    .map((s) => s.trim()).filter(Boolean).slice(0, 30);
  if (!body.title?.trim() || !list.length) fail(400, 'Workout name and exercises required');
  const [row] = await query(
    `INSERT INTO Posts (userId, title, exercises, note) OUTPUT INSERTED.id
     VALUES (@u, @t, @e, @n)`,
    { u: user.id, t: body.title.trim().slice(0, 100), e: JSON.stringify(list), n: body.note?.slice(0, 300) || null });
  return row;
});

endpoint('toggleLike', { methods: ['POST'], route: 'posts/{id}/like' }, async ({ user, params }) => {
  const postId = Number(params.id);
  const [p] = await query('SELECT id FROM Posts WHERE id=@id', { id: postId });
  if (!p) fail(404, 'Post not found');
  const had = (await query('SELECT 1 x FROM PostLikes WHERE postId=@p AND userId=@u', { p: postId, u: user.id })).length;
  await query(had
    ? 'DELETE FROM PostLikes WHERE postId=@p AND userId=@u'
    : 'INSERT INTO PostLikes (postId, userId) VALUES (@p, @u)', { p: postId, u: user.id });
  const [{ likes }] = await query('SELECT COUNT(*) AS likes FROM PostLikes WHERE postId=@p', { p: postId });
  return { liked: !had, likes };
});
