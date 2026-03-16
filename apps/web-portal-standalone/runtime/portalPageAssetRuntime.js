'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');

function getIconContentType(ext) {
  const normalized = String(ext || '').toLowerCase();
  if (normalized === '.png') return 'image/png';
  if (normalized === '.jpg' || normalized === '.jpeg') return 'image/jpeg';
  return 'image/webp';
}

function createPortalPageAssetRuntime(options = {}) {
  const {
    isProduction,
    loginHtmlPath,
    playerHtmlPath,
    landingHtmlPath,
    trialHtmlPath,
    showcaseHtmlPath,
    docsDirPath,
    scumItemsDirPath,
    faviconSvg,
    sendJson,
    sendHtml,
    buildSecurityHeaders,
    escapeHtml,
  } = options;

  let cachedLoginHtml = null;
  let cachedPlayerHtml = null;
  let cachedLandingHtml = null;
  let cachedTrialHtml = null;
  let cachedShowcaseHtml = null;
  let cachedLoginHtmlMtimeMs = 0;
  let cachedPlayerHtmlMtimeMs = 0;
  let cachedLandingHtmlMtimeMs = 0;
  let cachedTrialHtmlMtimeMs = 0;
  let cachedShowcaseHtmlMtimeMs = 0;

  function getFileMtimeMs(filePath) {
    try {
      const stat = fs.statSync(filePath);
      return Number(stat.mtimeMs || 0);
    } catch {
      return 0;
    }
  }

  function loadHtmlTemplate(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  function sendFavicon(res) {
    res.writeHead(
      200,
      buildSecurityHeaders({
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      }),
    );
    res.end(faviconSvg);
  }

  async function tryServeStaticScumIcon(req, res, pathname) {
    if (String(req.method || '').toUpperCase() !== 'GET') return false;
    const prefixes = ['/assets/scum-items/', '/player/assets/scum-items/'];
    const matchedPrefix = prefixes.find((prefix) => String(pathname || '').startsWith(prefix));
    if (!matchedPrefix) return false;

    let relativeName = '';
    try {
      relativeName = decodeURIComponent(String(pathname || '').slice(matchedPrefix.length));
    } catch {
      return false;
    }
    if (!relativeName || relativeName.includes('/') || relativeName.includes('\\')) {
      return false;
    }
    if (relativeName.includes('..')) {
      return false;
    }

    const ext = path.extname(relativeName).toLowerCase();
    if (!new Set(['.webp', '.png', '.jpg', '.jpeg']).has(ext)) {
      return false;
    }

    const absPath = path.resolve(scumItemsDirPath, relativeName);
    if (!absPath.startsWith(scumItemsDirPath)) {
      return false;
    }

    try {
      const stat = await fs.promises.stat(absPath);
      if (!stat.isFile()) {
        sendJson(res, 404, { ok: false, error: 'Not found' });
        return true;
      }
      res.writeHead(
        200,
        buildSecurityHeaders({
          'Content-Type': getIconContentType(ext),
          'Cache-Control': 'public, max-age=86400',
        }),
      );
      await pipeline(fs.createReadStream(absPath), res);
      return true;
    } catch {
      sendJson(res, 404, { ok: false, error: 'Not found' });
      return true;
    }
  }

  function getPlayerHtml() {
    const mtimeMs = getFileMtimeMs(playerHtmlPath);
    if (!cachedPlayerHtml || !isProduction || mtimeMs > cachedPlayerHtmlMtimeMs) {
      cachedPlayerHtml = loadHtmlTemplate(playerHtmlPath);
      cachedPlayerHtmlMtimeMs = mtimeMs;
    }
    return cachedPlayerHtml;
  }

  function getLandingHtml() {
    const mtimeMs = getFileMtimeMs(landingHtmlPath);
    if (!cachedLandingHtml || !isProduction || mtimeMs > cachedLandingHtmlMtimeMs) {
      cachedLandingHtml = loadHtmlTemplate(landingHtmlPath);
      cachedLandingHtmlMtimeMs = mtimeMs;
    }
    return cachedLandingHtml;
  }

  function getTrialHtml() {
    const mtimeMs = getFileMtimeMs(trialHtmlPath);
    if (!cachedTrialHtml || !isProduction || mtimeMs > cachedTrialHtmlMtimeMs) {
      cachedTrialHtml = loadHtmlTemplate(trialHtmlPath);
      cachedTrialHtmlMtimeMs = mtimeMs;
    }
    return cachedTrialHtml;
  }

  function getShowcaseHtml() {
    const mtimeMs = getFileMtimeMs(showcaseHtmlPath);
    if (!cachedShowcaseHtml || !isProduction || mtimeMs > cachedShowcaseHtmlMtimeMs) {
      cachedShowcaseHtml = loadHtmlTemplate(showcaseHtmlPath);
      cachedShowcaseHtmlMtimeMs = mtimeMs;
    }
    return cachedShowcaseHtml;
  }

  function renderMarkdownDocument(title, markdown) {
    return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body{margin:0;background:#0c1318;color:#e9f3f3;font-family:ui-sans-serif,system-ui,sans-serif}
    .shell{width:min(980px,calc(100% - 32px));margin:0 auto;padding:28px 0 44px}
    .card{background:#121d24;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:22px;box-shadow:0 24px 56px rgba(0,0,0,.28)}
    a{color:#8fd4c8}
    h1{margin:0 0 16px;font-size:32px}
    pre{white-space:pre-wrap;line-height:1.7;font-size:14px;color:#bcd0cf}
  </style>
</head>
<body>
  <div class="shell">
    <div class="card">
      <p><a href="/landing">กลับหน้า Landing</a></p>
      <h1>${escapeHtml(title)}</h1>
      <pre>${escapeHtml(markdown)}</pre>
    </div>
  </div>
</body>
</html>`;
  }

  function tryServePublicDoc(pathname, res) {
    if (!String(pathname || '').startsWith('/docs/')) return false;
    const relative = String(pathname || '').slice('/docs/'.length);
    if (!relative || !relative.toLowerCase().endsWith('.md')) return false;
    const absolute = path.resolve(docsDirPath, relative);
    if (!absolute.startsWith(docsDirPath)) return false;
    if (!fs.existsSync(absolute)) return false;
    const markdown = fs.readFileSync(absolute, 'utf8');
    sendHtml(res, 200, renderMarkdownDocument(path.basename(relative), markdown));
    return true;
  }

  function renderLoginPage(message) {
    const mtimeMs = getFileMtimeMs(loginHtmlPath);
    if (!cachedLoginHtml || !isProduction || mtimeMs > cachedLoginHtmlMtimeMs) {
      cachedLoginHtml = loadHtmlTemplate(loginHtmlPath);
      cachedLoginHtmlMtimeMs = mtimeMs;
    }
    const safe = escapeHtml(String(message || ''));
    return cachedLoginHtml.replace('__ERROR_MESSAGE__', safe);
  }

  return {
    sendFavicon,
    tryServeStaticScumIcon,
    getPlayerHtml,
    getLandingHtml,
    getTrialHtml,
    getShowcaseHtml,
    tryServePublicDoc,
    renderLoginPage,
  };
}

module.exports = {
  createPortalPageAssetRuntime,
};
