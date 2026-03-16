const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createPortalPageAssetRuntime,
} = require('../apps/web-portal-standalone/runtime/portalPageAssetRuntime');

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(chunk = '') {
      this.body += String(chunk || '');
    },
  };
}

test('portal page asset runtime renders login template and public docs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-page-assets-'));
  const docsDir = path.join(root, 'docs');
  const scumItemsDirPath = path.join(root, 'items');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(scumItemsDirPath, { recursive: true });

  const loginHtmlPath = path.join(root, 'login.html');
  const playerHtmlPath = path.join(root, 'player.html');
  const landingHtmlPath = path.join(root, 'landing.html');
  const trialHtmlPath = path.join(root, 'trial.html');
  const showcaseHtmlPath = path.join(root, 'showcase.html');
  fs.writeFileSync(loginHtmlPath, '<div>__ERROR_MESSAGE__</div>');
  fs.writeFileSync(playerHtmlPath, '<div>player</div>');
  fs.writeFileSync(landingHtmlPath, '<div>landing</div>');
  fs.writeFileSync(trialHtmlPath, '<div>trial</div>');
  fs.writeFileSync(showcaseHtmlPath, '<div>showcase</div>');
  fs.writeFileSync(path.join(docsDir, 'guide.md'), '# Guide');

  const runtime = createPortalPageAssetRuntime({
    isProduction: false,
    loginHtmlPath,
    playerHtmlPath,
    landingHtmlPath,
    trialHtmlPath,
    showcaseHtmlPath,
    docsDirPath: docsDir,
    scumItemsDirPath,
    faviconSvg: '<svg></svg>',
    sendJson() {
      throw new Error('sendJson should not be called in this test');
    },
    sendHtml(res, statusCode, html) {
      res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    },
    buildSecurityHeaders: (headers) => headers,
    escapeHtml(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    },
  });

  assert.equal(
    runtime.renderLoginPage('<script>alert(1)</script>'),
    '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>',
  );
  assert.equal(runtime.getPlayerHtml(), '<div>player</div>');
  assert.equal(runtime.getLandingHtml(), '<div>landing</div>');
  assert.equal(runtime.getTrialHtml(), '<div>trial</div>');
  assert.equal(runtime.getShowcaseHtml(), '<div>showcase</div>');

  const res = createResponse();
  const served = runtime.tryServePublicDoc('/docs/guide.md', res);
  assert.equal(served, true);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Guide/);
});
