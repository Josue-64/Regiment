// Azure Web App: serves the site and forwards /api/* to the Function App.
// The browser only talks to this origin, so there's no CORS and the function key stays secret.
const path = require('path');
const express = require('express');

const app = express();
// Tolerate a sloppy setting: add https:// if missing, drop trailing slash and /api
let target = (process.env.FUNCTION_APP_URL || '').trim();
if (target) {
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
  target = target.replace(/\/+$/, '').replace(/\/api$/i, '');
}

if (target) {
  const { createProxyMiddleware } = require('http-proxy-middleware');
  app.use(createProxyMiddleware({
    pathFilter: '/api/',   // trailing slash matters: plain '/api' would also catch /api.js
    target,                                           // e.g. https://workout-api.azurewebsites.net
    changeOrigin: true,
    headers: { 'x-functions-key': process.env.FUNCTION_KEY || '' }
  }));
} else {
  // Don't crash the whole site if the setting is missing; say what's wrong instead
  app.use('/api', (req, res) => res.status(500).json({ error: 'FUNCTION_APP_URL is not set on the Web App' }));
}

app.use(express.static(path.join(__dirname, 'public'), { index: 'home.html' }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log('Web app listening on ' + port));
