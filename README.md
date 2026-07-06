# Invois

Invois is an offline-first invoice and receipt maker for freelancers and small businesses. It helps users create invoices, mark invoices as paid, generate matching receipts, manage reusable clients and items, and export professional PDFs from desktop or mobile.

## Status

- Version: `1.0.0`
- Release stage: stable
- App type: client-side PWA
- Live app: https://invois.pages.dev
- Data storage: browser IndexedDB, local to the current device/browser profile
- CI gate: `npm run ci`

## Features

- Create, edit, delete, search, and filter invoices and receipts.
- Convert paid invoices into linked receipts.
- Prevent duplicate receipts for the same linked invoice.
- Manage client and item catalogs for faster invoice creation.
- Save business profile, bank details, default notes, terms, and tax rate.
- Auto-number documents by month, for example `INV-2026-07-0001`.
- Preview invoice and receipt layouts in the editor.
- Generate and download PDFs.
- Export and import all data as JSON backup.
- Mark invoices as Sent or Paid.
- Fuzzy search for clients and catalog items.
- Work offline after the app and assets are cached by the PWA service worker.
- Use responsive desktop and mobile layouts.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- IndexedDB via `idb`
- jsPDF and jsPDF AutoTable
- vite-plugin-pwa
- Vitest for unit tests
- Playwright for E2E tests
- ESLint + Prettier for code quality
- GitHub Actions CI

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- A modern Chromium-based browser for the current E2E setup

If Playwright browsers are not installed yet, run:

```bash
npx playwright install
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The app runs at:

```text
http://localhost:5173
```

Build the production app:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The preview server runs at:

```text
http://localhost:4173
```

## Live App

Production deployment:

```text
https://invois.pages.dev
```

The app is hosted on Cloudflare Pages.

## Cloudflare Pages Deployment

Use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20.19.0` or newer |

Run the local CI gate before deploying:

```bash
npm run ci
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run typecheck` | Typecheck app code and Playwright test code. |
| `npm run build` | Typecheck and build the production app into `dist/`. |
| `npm run preview` | Serve the built app locally. |
| `npm run test` | Run Vitest unit tests. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run lint` | Run ESLint on source code. |
| `npm run format` | Format source code with Prettier. |
| `npm run e2e` | Build the app and run Playwright E2E tests. |
| `npm run ci` | Run the full local CI gate: typecheck, lint, unit tests, build, and E2E tests. |

## Testing

The current E2E suite runs in:

- Desktop Chromium
- Mobile Chromium using the Pixel 5 device profile
- Timezone `Asia/Jakarta`

Unit tests (`npm run test`) cover:

- Currency formatting and parsing (`lib/format.ts`).
- Date helpers, UUID generation (`types.ts`).
- Calculation logic, share text generation.

E2E workflows cover:

- Invoice creation, reload persistence, paid status, and receipt creation.
- Receipt duplicate prevention.
- Dashboard paid/unpaid totals.
- Jakarta-local date handling.
- Required field validation.
- First-run editor setup from an empty IndexedDB.
- PDF download and non-empty file verification.
- Global document sorting across invoices and receipts.
- IndexedDB upgrade from v1 and v2 schemas.
- Data export and import round-trip.

Run the full local CI gate before every release:

```bash
npm run ci
```

## Project Structure

```text
.
|-- public/                 # PWA icons and static assets
|-- src/
|   |-- components/         # Shared layout components
|   |-- context/            # React context providers
|   |-- lib/                # IndexedDB, formatting, PDF, seed, and hooks
|   |-- pages/              # Route-level app screens
|   |-- styles/             # App and landing page styles
|   |-- App.tsx             # Route setup
|   |-- main.tsx            # React entrypoint
|   `-- types.ts            # Domain types and date/id helpers
|-- tests/e2e/              # Playwright E2E tests
|-- package.json            # Scripts and dependencies
|-- playwright.config.ts    # E2E configuration
|-- tsconfig.json           # App TypeScript configuration
|-- tsconfig.playwright.json
`-- vite.config.ts          # Vite and PWA configuration
```

## Data and Offline Behavior

Invois stores all user data in IndexedDB under the `invois` database. Data stays in the current browser profile and is not synced to a server.

The app seeds a starter business profile, sample clients, catalog items, and sample documents only when the database is completely empty. Existing user data should not be overwritten by seed data.

Schema upgrades are handled in `src/lib/db.ts`. Current database version: `3`.

## Release and Versioning

This project uses SemVer.

- Current version: `1.0.0`
- Patch releases should be reserved for narrow fixes that do not change expected behavior or data contracts.
- Minor releases should add features without breaking existing data or workflows.
- Major releases may include breaking changes to data schemas or APIs.

Before release:

```bash
npm run ci
```

To bump versions without creating a Git tag:

```bash
npm version <version> --no-git-tag-version
```

## Troubleshooting

If E2E tests fail because browsers are missing:

```bash
npx playwright install
```

If local data is stale during manual testing, clear the browser site data for the local app origin, or delete the `invois` IndexedDB database in DevTools.

If the preview server port is already in use, stop the process using port `4173` or run Vite preview with another port.

If PWA behavior looks stale during manual testing, unregister the service worker and clear cache storage in browser DevTools.

## License

MIT License.

Copyright (c) 2026 Anggie Irawan.

Portfolio: https://anggieirawan.my.id
