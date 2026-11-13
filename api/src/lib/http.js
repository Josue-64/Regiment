const jwt = require('jsonwebtoken');
const { app } = require('@azure/functions');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };

// auth: true = must be signed in, 'optional' = user if token present, false = public
function endpoint(name, { methods, route, auth = true }, handler) {
  app.http(name, {
    methods, route,
    authLevel: 'function', // Web App proxy adds the function key; locally it's ignored
    handler: async (request, context) => {
      try {
        let user = null;
        const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
        if (token) {
          try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { /* bad token */ }
        }
        if (auth === true && !user) fail(401, 'Sign in required');

        const body = ['POST', 'PUT', 'PATCH'].includes(request.method)
          ? await request.json().catch(() => ({})) : {};
        const data = await handler({ user, body, params: request.params, query: Object.fromEntries(request.query) });
        return { status: 200, jsonBody: data ?? { ok: true } };
      } catch (e) {
        if (e instanceof HttpError) return { status: e.status, jsonBody: { error: e.message } };
        context.error(e);
        return { status: 500, jsonBody: { error: 'Server error' } };
      }
    }
  });
}

const signToken = (u) => jwt.sign({ id: u.id, username: u.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

module.exports = { endpoint, fail, signToken };
