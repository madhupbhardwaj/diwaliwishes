// Serves the greeting page for links like /priya/doors with link-preview tags
// (WhatsApp, iMessage, Telegram, Facebook…) so the shared link shows
// "Priya wishes you a Happy Diwali 🪔" and a picture in that style.
// The page itself is the normal index.html; the browser does the rest.
const fs = require('fs');
const path = require('path');

const STYLES = ['deepawali', 'lantern', 'doors', 'midnight']; // same order as the website
let page = null;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const prettify = s => s.replace(/-/g, ' ').replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const decode = s => { try { return decodeURIComponent(s); } catch { return s; } };

async function loadPage(origin) {
  if (page) return page;
  try { page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'); }
  catch { page = await (await fetch(origin + '/index.html')).text(); }
  return page;
}

function withPreview(html, { name, style, msg, origin, url }) {
  const title = `${name} wishes you a Happy Diwali 🪔`;
  const desc = msg ? `“${msg}” — tap to open your animated Diwali greeting ✨` : 'Tap to open your animated Diwali greeting ✨ शुभ दीपावली';
  const image = `${origin}/og/${style}.jpg`;
  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Diwali Wishes">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(title)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
  ].join('\n');
  return html
    .replace(/<meta (property|name)="(og|twitter):[^"]*"[^>]*>\s*/g, '') // drop the generic defaults
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}">`)
    .replace('</head>', `${tags}\n</head>`);
}

module.exports = async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${host}`;
  try {
    const q = new URL(req.url, origin).searchParams;
    const raw = decode(q.get('n') || '').slice(0, 60);
    const name = prettify(raw.slice(0, 30)) || 'A friend';
    const s = (q.get('s') || '').toLowerCase();
    const style = STYLES.includes(s) ? s : STYLES[hash(raw) % STYLES.length];
    const msg = (q.get('m') || '').slice(0, 90);
    const shown = `/${encodeURIComponent(raw)}${q.get('s') ? '/' + encodeURIComponent(q.get('s')) : ''}${msg ? '?m=' + encodeURIComponent(msg) : ''}`;
    const html = withPreview(await loadPage(origin), { name, style, msg, origin, url: origin + shown });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.end(html);
  } catch (err) {
    // If anything goes wrong, still show the greeting (just without the custom preview)
    console.error(err);
    try { const fallback = await (await fetch(origin + '/404.html')).text(); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.statusCode = 200; res.end(fallback); }
    catch { res.statusCode = 302; res.setHeader('Location', '/'); res.end(); }
  }
};
module.exports.withPreview = withPreview;
