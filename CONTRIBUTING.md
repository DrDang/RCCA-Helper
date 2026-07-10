# Contributing

Thanks for helping improve RCCA Helper.

This project is intentionally lightweight: a browser-based RCCA workspace with a checked-in production build, a portable single-file HTML package, and simple cross-platform launchers. The goal of this guide is to keep contributions easy to make and easy to review.

## Local Setup

### Development Mode

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Production Build

```bash
npm run build
```

This refreshes the checked-in `dist/` output used by the double-click launchers.

## Before Opening A PR

- keep changes focused on one improvement or fix
- update `README.md` if behavior or setup changed
- rebuild `dist/` if the source code changed
- verify the app still runs through the launcher flow when relevant

## Working With The Portable Launchers

- `Run RCCA Helper.command` opens `dist/RCCA Helper.html` directly on macOS
- `Run RCCA Helper.bat` opens `dist/RCCA Helper.html` directly on Windows
- if the portable HTML is missing, rebuild with `npm install` and `npm run build`
- both launchers expect the portable app to exist at `dist/RCCA Helper.html`

If you change app behavior, remember that users may run the checked-in build directly without using Node.js.

## Good Issues And PRs

Helpful contributions usually include:

- a clear problem statement
- steps to reproduce if fixing a bug
- screenshots or short clips for UI changes
- notes about whether `dist/` was rebuilt

## Scope Guidance

Especially valuable improvements:

- usability improvements during live RCCA sessions
- better reporting or export workflows
- more reliable offline/local behavior
- cleaner investigation and corrective-action tracking
- documentation and packaging polish

## Questions

If you are unsure whether a change should include generated build output, default to:

1. include source changes
2. run `npm run build`
3. include the updated `dist/`

That keeps the repository runnable through the included launchers.
