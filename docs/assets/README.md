# Visual Assets

This folder contains exported visual artifacts that are referenced by the main docs.

Current assets:

- [architecture-overview.svg](./architecture-overview.svg)
- [runtime-validation-contract.svg](./runtime-validation-contract.svg)
- [admin-login.png](./admin-login.png)
- [admin-dashboard.png](./admin-dashboard.png)
- [player-landing.png](./player-landing.png)
- [player-login.png](./player-login.png)
- [player-showcase.png](./player-showcase.png)
- [platform-demo.gif](./platform-demo.gif)
- [CAPTURE_CHECKLIST.md](./CAPTURE_CHECKLIST.md)

What is still missing:

- authenticated player portal screenshots
- live in-game delivery evidence tied to a recorded session

Capture workflow:

- `npm run docs:capture-evidence`
- `npm run docs:build-demo-gif`
- current script captures local admin login, authenticated admin dashboard, player landing, player login, and player showcase surfaces
- current Windows capture flow also builds `platform-demo.gif`
- authenticated player portal views and live in-game delivery evidence still require a separate interactive capture pass
