const bcrypt = require('bcryptjs');
const { query } = require('../lib/db');
const { endpoint, fail, signToken } = require('../lib/http');

endpoint('register', { methods: ['POST'], route: 'auth/register', auth: false }, async ({ body }) => {
  const { username, password, displayName } = body;
  if (!username || !password || password.length < 8) fail(400, 'Username and a password of 8+ characters required');
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) fail(400, 'Username: 3-30 letters, numbers or _');
  if ((await query('SELECT 1 x FROM Users WHERE username=@u', { u: clean })).length) fail(409, 'Username taken');

  const hash = await bcrypt.hash(password, 10);
  const [user] = await query(
    `INSERT INTO Users (username, passwordHash, displayName) OUTPUT INSERTED.id, INSERTED.username
     VALUES (@u, @h, @d)`, { u: clean, h: hash, d: (displayName || clean).slice(0, 80) });
  return { token: signToken(user), user };
});

endpoint('login', { methods: ['POST'], route: 'auth/login', auth: false }, async ({ body }) => {
  const [user] = await query('SELECT * FROM Users WHERE username=@u', { u: (body.username || '').trim().toLowerCase() });
  if (!user || !(await bcrypt.compare(body.password || '', user.passwordHash))) fail(401, 'Wrong username or password');
  return { token: signToken(user), user: { id: user.id, username: user.username, displayName: user.displayName } };
});

endpoint('me', { methods: ['GET'], route: 'me' }, async ({ user }) => {
  const [me] = await query('SELECT id, username, displayName, bio FROM Users WHERE id=@id', { id: user.id });
  return me;
});
