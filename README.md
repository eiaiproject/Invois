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
  <a href="#tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-596949" alt="Version" />
  <img src="https://img.shields.io/badge/status-stable-3F6B49" alt="Status: Stable" />
  <img src="https://img.shields.io/badge/license-MIT-7A5F3A" alt="License: MIT" />
  <img src="https://img.shields.io/badge/PWA-offline%20ready-596949" alt="PWA: Offline Ready" />
</p>

---

## Overview

Invois is a client-side **Progressive Web App** that lets you create invoices, convert paid work into receipts, manage reusable clients and items, and export professional PDFs — all without an internet connection or user account. Data stays on your device, in your browser's IndexedDB.

---

## Features

- **📄 Invoice & Receipt Management** — Create, edit, delete, search, and filter documents.
- **🔗 Invoice-to-Receipt Flow** — Mark an invoice as paid and instantly generate a matching receipt. Duplicate prevention built in.
- **📇 Client & Item Catalogs** — Save reusable clients and items for faster document creation.
- **🏢 Business Profile** — Save bank details, default notes, terms, and tax rate.
- **🔢 Auto-Numbering** — Documents are automatically numbered by month (`INV-2026-07-0001`).
- **👁️ Live Preview** — See invoice and receipt layouts while editing (desktop side-by-side, mobile toggle).
- **📥 PDF Export** — Download individual PDFs or batch-export all documents as a ZIP archive.
- **📤 Data Backup** — Export and import all data as a single JSON file.
- **🌙 Dark Mode** — Automatically adapts to your system theme preference.
- **📱 Responsive** — Works on desktop, tablet, and mobile with a dedicated bottom navigation.
- **⚡ Offline-First** — Fully functional without internet after the initial load.
- **🔍 Fuzzy Search** — Search clients, items, and documents as you type.
- **⌨️ Keyboard-Friendly** — Section shortcuts (1–3) on landing page, accessible form controls.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 |
| **Language** | TypeScript |
| **Build Tool** | Vite 7 |
| **Routing** | React Router v6 |
| **Storage** | IndexedDB via `idb` |
| **PDF** | jsPDF + jsPDF AutoTable |
| **Icons** | [reicon](https://reicon.dev) (tree-shakeable SVG) |
| **ZIP** | JSZip |
| **PWA** | vite-plugin-pwa |
| **Unit Tests** | Vitest + Testing Library |
| **E2E Tests** | Playwright (Chromium, Mobile Chrome) |
| **Linting** | ESLint |
| **Formatting** | Prettier |
| **CI** | GitHub Actions |

---

## Getting Started

### Prerequisites

- **Node.js** `^20.19.0` or `>=22.12.0`
- **npm**
- A modern Chromium-based browser (for E2E tests)

### Installation

```bash
# Clone the repository
git clone https://github.com/eiaiproject/Invois
cd invois

# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

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
| `npm run typecheck` | Run TypeScript type checking |
| `npm run build` | Typecheck and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run e2e` | Build and run Playwright E2E tests |
| `npm run ci` | Full CI gate: typecheck → lint → test → build → e2e |

---

## Testing

### Unit Tests (`npm run test`)

39 tests covering:
- Currency formatting and IDR parsing (`lib/format.ts`)
- Date helpers, UUID generation (`types.ts`)
- Invoice/receipt calculation logic
- Share text generation

### E2E Tests (`npm run e2e`)

50 tests across **Desktop Chromium** and **Mobile Chrome** (Pixel 5) covering:

| Suite | Tests | Scope |
|-------|:-----:|-------|
| Landing page | 3 | Hero, mobile nav, keyboard shortcuts |
| Dashboard | 2 | Info modal, create buttons |
| Navigation | 2 | Bottom nav (mobile), sidebar (desktop) |
| Clients CRUD | 2 | Create/edit/search, validation |
| Items CRUD | 2 | Create/edit/search, validation |
| Document Editor | 3 | Receipt creation, preview toggle, validation |
| Document Detail | 2 | Full invoice lifecycle, receipt actions |
| Settings | 2 | Profile save/persistence |
| Download All | 1 | ZIP batch export |
| Search & Filter | 1 | Type filter + text search |
| Document workflows | 6 | Invoice lifecycle, PDF, DB upgrades, import/export |

---

## Project Structure

```
.
├── public/                       # PWA icons, favicon, manifest
├── src/
│   ├── components/               # Reusable React components
│   │   ├── Layout.tsx            # App shell (sidebar, topbar, bottom nav)
│   │   └── Reicon.tsx            # reicon SVG wrapper
│   ├── context/
│   │   └── toast.tsx             # Toast notification provider
│   ├── lib/
│   │   ├── db.ts                 # IndexedDB operations & schema upgrades
│   │   ├── format.ts             # IDR formatting, date utils, share text
│   │   ├── pdf.ts                # PDF generation & ZIP batch download
│   │   ├── seed.ts               # First-run data seeder
│   │   └── useUnsavedChanges.ts  # Unsaved changes prompt hook
│   ├── pages/
│   │   ├── Landing.tsx           # Marketing landing page
│   │   ├── Dashboard.tsx         # Stats & recent documents
│   │   ├── Documents.tsx         # Document list with search & filter
│   │   ├── DocumentEditor.tsx    # Invoice/receipt create & edit form
│   │   ├── DocumentDetail.tsx    # Single document view & actions
│   │   ├── Clients.tsx           # Client list & editor
│   │   ├── Items.tsx             # Item catalog list & editor
│   │   └── Settings.tsx          # Business profile & data management
│   ├── styles/
│   │   ├── app.css               # Design system, components, layouts
│   │   └── landing.css           # Landing page styles
│   ├── App.tsx                   # Route definitions
│   ├── main.tsx                  # React entry point
│   └── types.ts                  # Domain types & helpers
├── tests/e2e/
│   ├── all-flows.spec.ts         # Comprehensive E2E test suite
│   ├── document-workflows.spec.ts # Document lifecycle tests
│   ├── helpers.ts                # E2E test utilities
│   └── invoice-smoke.spec.ts     # Invoice smoke tests
├── public/                       # Static assets
├── index.html                    # HTML entry point
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.playwright.json
└── vite.config.ts
```

---

## Deployment

### Cloudflare Pages

| Setting | Value |
|---------|-------|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20.19.0` or newer |

```bash
# Run CI gate before deploying
npm run ci
```

### Build Output

```
dist/
├── index.html
├── manifest.webmanifest
├── registerSW.js
├── sw.js                          # Service worker
├── workbox-*.js                   # Workbox runtime
└── assets/
    ├── index-*.css                # Global styles (~44 KB)
    ├── index-*.js                 # App bundle (~221 KB)
    ├── pdf-*.js                   # PDF library (lazy-loaded)
    └── ...                        # Route-level code-split chunks
```

---

## Versioning

This project follows [SemVer 2.0.0](https://semver.org/).

| Release | Criteria |
|---------|----------|
| **Major** | Breaking changes to data schemas or APIs |
| **Minor** | New features, backward-compatible |
| **Patch** | Bug fixes, performance improvements, no behavior changes |

```bash
# Check current version
node -e "console.log(require('./package.json').version)"

# Bump version (without git tag)
npm version <major|minor|patch> --no-git-tag-version
```

### Version History

- **1.1.0** — UI/UX overhaul, dark mode, reicon icons, skeleton loading, batch ZIP export, comprehensive E2E tests
- **1.0.0** — Initial stable release: invoice/receipt CRUD, PDF generation, client/item catalogs, offline PWA

---

## Data & Privacy

- **All data stays on your device.** Invois does not use a backend server, cloud sync, or analytics.
- Storage uses the browser's **IndexedDB** under the `invois` database. Data is scoped to the browser profile.
- Clearing browser site data for the app origin will remove all stored data. Export a JSON backup first.
- The app seeds sample data **only when the database is completely empty**.
- Current database schema version: `3` (auto-migration handled in `src/lib/db.ts`).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| E2E tests fail: "browser not found" | Run `npx playwright install` |
| Stale data during development | Clear IndexedDB via DevTools → Application → Storage |
| PWA shows stale content | Unregister service worker in DevTools → Application → Service Workers |
| Port conflict (5173/4173) | Stop the process using the port or use a different port |
| Build fails with type errors | Run `npm run typecheck` and fix errors before building |

---

## License

MIT License. Copyright © 2026 [Anggie Irawan](https://anggieirawan.my.id).

---

<p align="center">
  <a href="https://invois.pages.dev" target="_blank">Try Invois →</a>
</p>
