<p align="center">
  <img src="public/favicon.svg" alt="Invois" width="64" height="64" />
</p>

<h1 align="center">Invois</h1>

<p align="center">
  <strong>Offline-first invoice and receipt maker for freelancers and small businesses.</strong>
</p>

<p align="center">
  <a href="https://invois.pages.dev" target="_blank">Live App</a>
  ·
  <a href="#features">Features</a>
  ·
  <a href="#getting-started">Getting Started</a>
  ·
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.4.0-596949" alt="Version" />
  <img src="https://img.shields.io/badge/status-stable-3F6B49" alt="Status: Stable" />
  <img src="https://img.shields.io/badge/license-MIT-7A5F3A" alt="License: MIT" />
  <img src="https://img.shields.io/badge/PWA-offline%20ready-596949" alt="PWA: Offline Ready" />
</p>

---

## Overview

Invois is a browser-based invoice and receipt maker for freelancers and small businesses. It covers the full document loop: build an invoice from reusable clients and items, send it, mark it as paid, and issue a matching receipt.

The app runs entirely on the client. There is no backend, no account, and no sync service. Documents live in the browser's IndexedDB, so the app works offline after the first visit and the data stays on the device.

**Scope:** Invois produces commercial invoices and receipts. It does not calculate or file taxes, and it does not replace accounting software. Check local rules for what a valid invoice must contain.

---

## Table of Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Data and privacy](#data-and-privacy)
- [Deployment](#deployment)
- [Versioning](#versioning)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## How it works

### Documents and numbering

Invois has two document types: **invoices** and **receipts**. Both share the same editor, line items, totals, and PDF layout. A document number follows the pattern `TYPE-YYYY-MM-NNNN`, for example `INV-2026-07-0001` or `RCPT-2026-07-0001`. The sequence resets each month and is stored per document type. The counter is allocated inside an IndexedDB transaction, so two open tabs cannot receive the same number.

### Invoice lifecycle

```text
Draft ──▶ Sent ──▶ Paid ──▶ Receipt issued
             │
             └──▶ Overdue (derived from the due date)
```

- **Draft** is the default state for a new invoice.
- **Sent** records that the invoice has been delivered to the client.
- **Paid** is set when the invoice is marked as paid.
- **Overdue** is not stored separately. It is derived when a sent invoice passes its due date, so the status stays correct without a background job.
- **Cancelled** stops a document from being used further. Cancelled documents stay in the list for reference.

### Receipts and payment integrity

A receipt can be created from a paid invoice. Saving the receipt and marking the invoice as paid happen in one transaction, so a receipt cannot exist while its invoice still reads as unpaid.

Each invoice can have only one active receipt. The duplicate check runs inside the transaction, which closes the race between two tabs. While an active receipt exists, the invoice total is locked; delete or cancel the receipt first to change it. Deleting or cancelling the last active receipt moves the linked invoice back to **sent**.

### Offline behavior

The production build registers a service worker that precaches the app shell, styles, icons, and self-hosted fonts. After the first successful load, routes and assets are served from the cache. The service worker updates automatically on the next load when a new build is available.

### Sample data

On a completely empty database, the app seeds a small set of example records. A notice inside the app marks them as samples and offers one-click removal. Once removed, the seeder does not run again unless the database is cleared.

---

## Features

### Documents

- Create, edit, delete, search, and filter invoices and receipts.
- Live preview while editing: side by side on desktop, toggleable on mobile.
- Line items with quantity, unit, price, and automatic line totals.
- Tax rate and discount, with values clamped to a valid range.
- Notes, terms, issue date, due date, and payment details.
- Monthly auto-numbering with a stable prefix per document type.
- Batch download of all documents as a ZIP archive.

### Clients and items

- Reusable client and item catalogs with live search.
- Autocomplete in the editor, with keyboard navigation and screen reader support.
- Each document keeps a snapshot of the client details, so later catalog edits do not rewrite issued documents.

### Output and backup

- Individual PDF export generated in the browser.
- Full data export to a single JSON file.
- JSON import with file validation, atomic writes, and counter repair so numbering continues correctly after a restore.

### Interface

- Desktop sidebar and a bottom navigation bar on mobile.
- System, light, and dark themes, remembered per device.
- Visible focus states, keyboard-operable dialogs, and labeled form controls.
- Empty, loading, and error states for every data screen.
- Layout that holds at 320px width and at 200% browser text size.

### Installation and updates

- Installable PWA with manifest icons and a standalone display mode.
- No third-party requests: fonts and assets are served from the app origin.
- The app version is injected at build time and shown in the app info panel.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 |
| **Language** | TypeScript |
| **Build tool** | Vite 7 |
| **Routing** | React Router v6 |
| **Storage** | IndexedDB via `idb` |
| **PDF** | jsPDF + jsPDF AutoTable |
| **Icons** | [Lucide](https://lucide.dev) via `lucide-react` |
| **ZIP** | JSZip |
| **PWA** | vite-plugin-pwa |
| **Unit tests** | Vitest + Testing Library |
| **E2E tests** | Playwright (Desktop Chrome, Pixel 5) |
| **Linting** | ESLint |
| **Formatting** | Prettier |
| **CI** | GitHub Actions |

---

## Architecture

### Runtime model

```text
React pages and components
        │
        ▼
src/lib (db, pdf, format, seed, theme)
        │
        ▼
IndexedDB  ◀── no network ──  Browser
```

Pages read and write through `src/lib/db.ts`, which wraps IndexedDB with `idb`. PDFs and ZIP archives are generated locally with jsPDF and JSZip. The app never uploads document data. The only network traffic is the initial load of the app assets.

### Data model

The database is named `invois` and currently uses schema version `3`. Migrations run automatically when a stored database is older than the code.

| Store | Contents |
|-------|----------|
| `business` | One business profile: contact details, logo, bank details, default notes and terms, default tax rate |
| `clients` | Saved clients with contact and tax details |
| `items` | Saved products or services with unit and price |
| `invoices` | Invoice documents, including line items, totals, status, and a client snapshot |
| `receipts` | Receipt documents, optionally linked to an invoice |
| `counters` | Monthly numbering counters per document type |

### Routes

| Route | Screen |
|-------|--------|
| `/` | Landing page |
| `/dashboard` | Totals, recent documents, quick actions |
| `/documents` | Document list with search and filters |
| `/documents/new/:type` | Create an invoice or receipt |
| `/documents/:type/:id` | Document detail and actions |
| `/documents/:type/:id/edit` | Edit an existing document |
| `/clients`, `/clients/new`, `/clients/:id` | Client list and editor |
| `/items`, `/items/new`, `/items/:id` | Item list and editor |
| `/settings` | Business profile, theme, import and export |
| `*` | Not found |

### Source layout

- `src/pages` contains route-level screens.
- `src/components` contains shared UI: layout, dialogs, editor fields, autocomplete, loading, error boundary, and SEO tags.
- `src/lib` contains side effects and pure helpers: database access, PDF generation, formatting, seeding, theme handling, and unsaved-change prompts.
- `src/styles` contains the design system in `app.css` and page-specific styles in `landing.css`.

---

## Getting started

### Prerequisites

- **Node.js** `^20.19.0` or `>=22.12.0`
- **npm**
- A modern Chromium-based browser for the E2E suite

### Installation

```bash
git clone https://github.com/eiaiproject/Invois
cd invois

npm install

# First time only, for E2E tests
npx playwright install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Production build

```bash
npm run build
npm run preview
```

The preview server runs at [http://localhost:4173](http://localhost:4173).

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run typecheck` | Type-check the app and the Playwright tests |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Run ESLint |
| `npm run format` | Format `src/` with Prettier |
| `npm run generate-og` | Rebuild `public/og-image.png` from `public/og-image.svg` |
| `npm run e2e` | Build and run the Playwright suite |
| `npm run ci` | Full gate: typecheck, lint, unit tests, build, E2E |

---

## Testing

### Unit tests

`npm run test` runs 55 tests:

- Currency formatting, IDR parsing, discount clamping, and email validation (`lib/format.ts`)
- Date helpers, ID generation, and derived invoice status (`types.ts`)
- Invoice and receipt totals and share text
- First-run seeding guard and sample record removal (`lib/seed.ts`, `lib/db.ts`)
- Backup validation, atomic import, and counter repair (`lib/db.ts`)

### End-to-end tests

`npm run e2e` runs 46 tests per browser profile (92 total) against Desktop Chrome and Mobile Chrome (Pixel 5):

| Suite | Tests | Scope |
|-------|:-----:|-------|
| Landing page | 2 | Hero and CTA navigation, mobile drawer |
| Dashboard | 2 | Info dialog, create actions |
| Navigation | 2 | Bottom navigation on mobile, sidebar on desktop |
| Clients | 2 | Create, edit, search, validation |
| Items | 2 | Create, edit, search, validation |
| Document editor | 3 | Receipt creation, preview toggle, validation |
| Document detail | 2 | Full invoice lifecycle, receipt actions |
| Settings | 1 | Profile save and persistence |
| Download all | 1 | ZIP batch export |
| Search and filter | 1 | Type filter and text search |
| Document workflows | 6 | Lifecycle, PDF, database upgrades, import and export |
| Invoice smoke | 1 | Invoice survives reload and becomes a receipt |
| Landing rendering and a11y | 13 | Contrast per state, focus ring, mobile drawer, 320px to 1440px overflow, reduced motion, forced colors, hero grid |
| Audit and accessibility | 8 | Theme sync, empty states, dialog names, field errors, 200% text reflow, scrollable bottom navigation |

CI runs on every push and pull request to `main`: typecheck, lint, unit tests with coverage, optional SonarCloud scan, build, and the full E2E suite.

---

## Project structure

```text
.
├── .github/workflows/ci.yml      # Typecheck, lint, tests, build, E2E
├── public/                       # PWA icons, favicon, OG image, sitemap, robots
│   ├── _headers                  # CSP, HSTS, COOP/CORP, and other security headers
│   ├── _redirects                # SPA fallback
│   ├── theme-init.js             # Applies the saved theme before first paint
│   └── fonts/                    # Self-hosted Plus Jakarta Sans (OFL)
├── scripts/
│   └── generate-og-image.mjs     # Rebuilds public/og-image.png from the SVG
├── src/
│   ├── components/
│   │   ├── ConfirmDialog.tsx     # Reusable confirmation dialog
│   │   ├── DocumentEditorForm.tsx # Shared invoice and receipt fields
│   │   ├── DocumentEditorSuggestions.tsx # Client and item autocomplete
│   │   ├── ErrorBoundary.tsx     # Crash fallback with data recovery
│   │   ├── Layout.tsx            # App shell: sidebar, top bar, bottom navigation
│   │   ├── LoadingScreen.tsx     # Announced loading state
│   │   ├── SEO.tsx               # Per-route meta and canonical URL
│   │   ├── SampleDataNotice.tsx  # Labels and removes seeded demo records
│   │   └── editorTypes.ts        # Editor form types
│   ├── context/
│   │   ├── toast.tsx             # Toast provider
│   │   └── toastContext.ts       # Toast context and hook
│   ├── lib/
│   │   ├── db.ts                 # IndexedDB operations, transactions, migrations
│   │   ├── download.ts           # Safari-safe file download helper
│   │   ├── format.ts             # IDR formatting, dates, share text
│   │   ├── pdf.ts                # PDF generation and ZIP batch download
│   │   ├── seed.ts               # First-run sample data seeder
│   │   ├── theme.ts              # System, light, and dark preference
│   │   └── useUnsavedChanges.ts  # Unsaved changes prompt
│   ├── pages/
│   │   ├── Landing.tsx           # Marketing landing page
│   │   ├── Dashboard.tsx         # Totals and recent documents
│   │   ├── Documents.tsx         # Document list with search and filters
│   │   ├── DocumentEditor.tsx    # Create and edit invoices or receipts
│   │   ├── DocumentDetail.tsx    # Single document view and actions
│   │   ├── Clients.tsx           # Client list and editor
│   │   ├── Items.tsx             # Item list and editor
│   │   └── Settings.tsx          # Business profile, theme, data management
│   ├── styles/
│   │   ├── app.css               # Design system, components, layouts
│   │   └── landing.css           # Landing page styles
│   ├── App.tsx                   # Route definitions
│   ├── main.tsx                  # React entry point
│   └── types.ts                  # Domain types and helpers
├── tests/
│   ├── e2e/
│   │   ├── all-flows.spec.ts     # Main flow suite
│   │   ├── audit.spec.ts         # Audit regression checks
│   │   ├── document-workflows.spec.ts # Document lifecycle
│   │   ├── helpers.ts            # Shared test utilities
│   │   ├── invoice-smoke.spec.ts # Invoice reload and receipt flow
│   │   └── landing-ui.spec.ts    # Landing contrast, keyboard, responsive checks
│   └── unit/
│       ├── db-import.test.ts     # Import validation and atomic writes
│       ├── format.test.ts        # Currency, date, and email helpers
│       ├── seed.test.ts          # First-run seeding guard
│       └── types.test.ts         # Dates, ids, derived status
├── DESIGN.md                     # Design direction and tradeoffs
├── index.html                    # HTML entry point
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.playwright.json
└── vite.config.ts
```

---

## Data and privacy

- **Local only.** Invois has no backend, cloud sync, or analytics. Documents are stored in the browser's IndexedDB under the `invois` database.
- **No third-party requests.** Fonts and assets are served from the app origin. The app does not call Google Fonts, analytics, or tracking services.
- **Per browser profile.** Data belongs to the origin and browser profile. It does not follow the user to another browser or device.
- **Clearing site data deletes everything.** Export a JSON backup first from Settings.
- **Strict headers.** `public/_headers` sets a Content Security Policy plus HSTS, COOP/CORP, Referrer-Policy, Permissions-Policy, X-Frame-Options, and nosniff. The CSP blocks inline styles and inline scripts: the theme bootstrap is a static file, all styling lives in stylesheets, and the JSON-LD block is allowlisted by hash. No third-party script, style, font, or connect origins are allowed.
- **Schema version** is `3`. Older databases migrate automatically on open. Importing a backup from a newer schema is rejected instead of partly applied.

---

## Deployment

### Cloudflare Pages

| Setting | Value |
|---------|-------|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20.19.0` or newer |

`public/_redirects` provides the SPA fallback, so direct links such as `/documents` resolve to `index.html` on Cloudflare Pages. `public/_headers` applies the security headers in production.

```bash
# Run the full gate before deploying
npm run ci
```

### Build output

```text
dist/
├── index.html
├── _headers                       # CSP and security headers
├── _redirects                     # SPA fallback
├── manifest.webmanifest
├── registerSW.js
├── sw.js                          # Service worker
├── workbox-*.js                   # Workbox runtime
├── fonts/
│   ├── plus-jakarta-sans-latin.woff2
│   ├── plus-jakarta-sans-latin-ext.woff2
│   └── OFL.txt
└── assets/
    ├── index-*.css                # Global styles
    ├── index-*.js                 # App bundle
    ├── pdf-*.js                   # PDF library, lazy-loaded
    └── ...                        # Route-level code-split chunks
```

---

## Versioning

This project follows [SemVer 2.0.0](https://semver.org/).

| Release | Criteria |
|---------|----------|
| **Major** | Breaking changes to data schemas or APIs |
| **Minor** | New features, backward-compatible |
| **Patch** | Bug fixes and performance improvements, no behavior changes |

```bash
# Check the current version
node -e "console.log(require('./package.json').version)"

# Bump the version without creating a tag
npm version <major|minor|patch> --no-git-tag-version

# Tag the release once the version is on main
git tag v$(node -p "require('./package.json').version")
git push origin --tags
```

### Version history

- **1.4.0**: Landing page rewrite, readable hover and active colors, symmetric hero highlights, self-hosted fonts, strict security headers, 200% text reflow hardening, landing UI and accessibility suite, Lucide icons
- **1.3.0**: Invoice, receipt, and import integrity fixes; system, light, and dark themes; labeled and removable sample data; WCAG AA contrast in both themes; announced loading states; design direction in `DESIGN.md`
- **1.2.0**: SEO layer with per-page meta, structured data, sitemap, and OG images; SonarCloud quality gate with coverage; refreshed PWA and branding assets
- **1.1.0**: UI overhaul, dark mode, icon set, skeleton loading, batch ZIP export, broader E2E coverage
- **1.0.0**: Initial stable release with invoice and receipt CRUD, PDF generation, client and item catalogs, and the offline PWA

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| E2E tests fail with "browser not found" | Run `npx playwright install` |
| Stale data during development | Clear IndexedDB in DevTools, Application, Storage |
| PWA serves an old build | Unregister the service worker in DevTools, Application, Service Workers |
| Port conflict on 5173 or 4173 | Stop the process using the port, or run Vite with another port |
| Build fails with type errors | Run `npm run typecheck` and fix the errors before building |

---

## Contributing

1. Fork the repository and create a branch from `main`.
2. Make the change and run `npm run ci` locally.
3. Open a pull request describing the behavior changed and the checks you ran.

Keep the client-only model intact. A change that requires a server, an account, or a third-party request does not fit the project.

---

## License

MIT License. Copyright © 2026 [Anggie Irawan](https://anggieirawan.my.id).

---

<p align="center">
  <a href="https://invois.pages.dev" target="_blank">Open Invois</a>
</p>
