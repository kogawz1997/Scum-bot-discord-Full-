# Owner UI Prototype

Isolated React prototype for the SCUM Owner/Owen control plane redesign.

This app is intentionally separate from the current `apps/owner-web` runtime. It does not replace the production Owner Panel.

The prototype now uses a backend-first data layer:

- It calls the real Owner/Admin endpoints through the Vite dev proxy.
- It does not silently replace unavailable backend data with mock records by default.
- If the backend is reachable but the browser is not authenticated, the dashboard links to a separate prototype login surface at `/login`.
- The login surface is implemented separately in `src/OwnerLoginPage.jsx` and posts to `/owner/api/login`.
- If only some backend slices are available, it marks the page as partial live data and keeps the real returned records.
- Page actions are resolved through `src/lib/owner-actions.js`; actions without required payloads, confirmations, or endpoints are disabled instead of pretending to work.
- The footer shows whether the current page is using live backend data, partial backend data, or blocked/offline data.

## Run

```powershell
cd C:\new\apps\owner-ui-prototype
npm install
npm run dev
```

Open `http://127.0.0.1:5177`.

Open `http://127.0.0.1:5177/login` for the separate Owner login surface.

## Prototype routes

- `/` and `/overview` - platform overview
- `/tenants` - tenant management
- `/packages` - package management
- `/billing` - billing and ledger
- `/subscriptions` - subscription oversight
- `/fleet` - Delivery Agent and Server Bot fleet
- `/observability` - telemetry and diagnostics
- `/incidents` - notifications and alert handling
- `/support` - support diagnostics
- `/recovery` - backup and restore readiness
- `/security` - audit and security
- `/settings` - runtime and integration settings
- `/login` - separate Owner login surface

By default, API calls proxy to `http://127.0.0.1:3201`, which is the current Owner web runtime target. Override it if needed:

```powershell
$env:OWNER_UI_PROXY_TARGET="http://127.0.0.1:3201"
npm run dev
```

## Notes

- Uses Vite + React + Tailwind + lucide-react + framer-motion.
- Local `src/components/ui/*` files provide the minimal shadcn-style component API needed by the prototype.
- Backend API paths are mapped in `src/lib/owner-adapters.js`.
- Page loading is implemented in `src/lib/owner-api.js`.
- Owner login/logout helpers are implemented in `src/lib/owner-auth.js`.
- Safe/readiness actions are mapped where a real endpoint exists. Risky actions still require explicit payload and confirmation before they can run.

## Features

### Analytics & Intelligence
- **Analytics Dashboard** (`src/components/ui/analytics-dashboard.jsx`) - Platform health score, revenue trends, tenant breakdown, revenue health indicators. Displays "—" for empty data instead of misleading zeros.
- **Recommendations engine** (`src/lib/recommendations.js`) - Generates suggested owner actions from platform data.
- **Alerts system** (`src/lib/alerts-generator.js`, `src/components/ui/alerts-center.jsx`) - Auto-generates alerts from recommendations and metrics (offline agents, failed payments, overdue invoices). Alerts auto-update whenever backend data changes.
- **Automation rules** (`src/lib/automation-rules.js`, `src/components/ui/automation-panel.jsx`) - 6 built-in automation rules with trigger/action/condition patterns, human-readable help text, and condition labels (auto-renew, agent offline alert, runtime scaling, invoice reminder, high-risk flagging, nightly backup).

### UX & Robustness
- **Error boundaries** (`src/components/ui/error-boundary.jsx`) - Page content is wrapped so a rendering error shows a recoverable UI instead of a blank screen.
- **Loading states** - The shared `Button` component supports a `loading` prop that renders a spinner and disables the button.
- **Mobile support** - Fully responsive layout. Below the `lg` breakpoint (1024px) the sidebar collapses behind a hamburger toggle in the header and slides in as a full-screen overlay. Navigation auto-closes the overlay so the user lands directly on the selected page.
- **Help text & tooltips** - Automation rule cards surface a 💡 help line and human-readable condition labels so operators do not need to memorise internal trigger keys.

## Verification

Run unit tests and a production build:

```powershell
npm test
npm run build
```

Run browser QA with mocked live backend data. This checks the main support/i18n flow and every Owner route in desktop and mobile viewports:

```powershell
npm run verify:browser
```

The route smoke report is written to `output/playwright/owner-route-smoke-report.json`.

Run a read-only live backend smoke check against a real Owner/Admin backend:

```powershell
$env:OWNER_API_BASE="http://127.0.0.1:3201"
$env:OWNER_USERNAME="owner"
$env:OWNER_PASSWORD="<password>"
npm run verify:live
```

You can also provide a cookie directly:

```powershell
$env:OWNER_AUTH_COOKIE="owner_session=..."
npm run verify:live
```

Or use a cookie file without printing secrets to the console:

```powershell
$env:OWNER_AUTH_COOKIE_FILE="C:\new\owner.cookies"
npm run verify:live
```

`verify:live` only calls read-only JSON endpoints. Mutation and download endpoints are intentionally skipped.
