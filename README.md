# Invois — Invoice & Receipt Maker

Offline-first PWA for freelancers and small businesses to create professional invoices and receipts.

## Quick start

```bash
npm install
npm run dev     # dev server at localhost:5173
npm run build   # production build → dist/
```

## Features

- Create, edit, delete invoices & receipts
- Convert paid invoices to receipts
- Live preview (desktop split-view)
- PDF generation + download + Web Share API
- Client & item catalog
- Business profile & document defaults
- Auto-numbering (INV-2026-07-0001, RCPT-2026-07-0001)
- Offline saved data (IndexedDB)
- PWA installable
- Mobile-first responsive

## Tech stack

Vite + React 18 + TypeScript · IndexedDB (idb) · jsPDF · vite-plugin-pwa

## Theming

Olive Minimal · Plus Jakarta Sans · CSS custom properties in `src/styles/app.css`
