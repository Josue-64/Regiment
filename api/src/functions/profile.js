const { query } = require('../lib/db');
const { endpoint, fail } = require('../lib/http');
const { newUploadUrl, readUrl, removeBlob } = require('../lib/blob');

// Public profile: info, stats, and their shared workouts (photos stay private)
endpoint('getProfile', { methods: ['GET'], route: 'users/{username}', auth: false }, async ({ params }) => {
  const [u] = await query('SELECT id, username, displayName, bio, createdAt FROM Users WHERE username=@u', { u: params.username.toLowerCase() });
  if (!u) fail(404, 'User not found');
  const [stats] = await query(
    `SELECT (SELECT COUNT(*) FROM WorkoutLogs WHERE userId=@id) AS workoutsLogged,
            (SELECT COUNT(*) FROM Posts WHERE userId=@id) AS workoutsShared,
            (SELECT COUNT(*) FROM PostLikes pl JOIN Posts p ON p.id=pl.postId WHERE p.userId=@id) AS likesReceived`, { id: u.id });
  const posts = await query('SELECT TOP 6 id, title, exercises FROM Posts WHERE userId=@id ORDER BY createdAt DESC', { id: u.id });
  const { id, ...publicUser } = u;
  return { ...publicUser, stats, favorites: posts.map((p) => ({ ...p, exercises: JSON.parse(p.exercises) })) };
});

endpoint('updateProfile', { methods: ['PUT'], route: 'me' }, async ({ user, body }) => {
  await query('UPDATE Users SET displayName=COALESCE(@d, displayName), bio=COALESCE(@b, bio) WHERE id=@id',
    { id: user.id, d: body.displayName?.slice(0, 80) || null, b: body.bio?.slice(0, 300) ?? null });
});

// ---- Private progress photos (Blob Storage) ----
// Step 1: ask for an upload URL.  Step 2: browser PUTs the file to it
// (header "x-ms-blob-type: BlockBlob").  Step 3: confirm so we record it in SQL.
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

endpoint('photoUploadUrl', { methods: ['POST'], route: 'photos/upload-url' }, async ({ user, body }) => {
  const ext = TYPES[body.contentType];
  if (!ext) fail(400, 'Only JPEG, PNG or WebP images');
  return newUploadUrl(user.id, ext);
});

endpoint('confirmPhoto', { methods: ['POST'], route: 'photos' }, async ({ user, body }) => {
  if (!body.blobName?.startsWith(`${user.id}/`)) fail(400, 'Invalid photo');
  const [row] = await query('INSERT INTO Photos (userId, blobName) OUTPUT INSERTED.id VALUES (@u, @b)', { u: user.id, b: body.blobName });
  return row;
});

endpoint('listPhotos', { methods: ['GET'], route: 'photos' }, async ({ user }) => {
  const rows = await query('SELECT id, blobName, createdAt FROM Photos WHERE userId=@u ORDER BY createdAt DESC', { u: user.id });
  return Promise.all(rows.map(async (r) => ({ id: r.id, createdAt: r.createdAt, url: await readUrl(r.blobName) })));
});

endpoint('deletePhoto', { methods: ['DELETE'], route: 'photos/{id}' }, async ({ user, params }) => {
  const [p] = await query('SELECT blobName FROM Photos WHERE id=@id AND userId=@u', { id: Number(params.id), u: user.id });
  if (!p) fail(404, 'Photo not found');
  await removeBlob(p.blobName);
  await query('DELETE FROM Photos WHERE id=@id', { id: Number(params.id) });
});
