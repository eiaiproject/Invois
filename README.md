# Invois

## Overview
Invois is a modern web application for creating, managing, and exporting invoices. Built with **React 19**, **Vite**, **Tailwind CSS**, and **Dexie** for client‑side IndexedDB storage, it provides a responsive UI and PDF generation via `@react-pdf/renderer`. The application can be used as a standalone client or served through the optional Express backend.

## Features
- **Create invoices** with automatic line‑item calculations.
- **Invoice history** stored locally using IndexedDB (Dexie) with reactive hooks.
- **PDF export** using a custom `InvoicePDF` component.
- **Responsive layout** powered by Tailwind CSS.
- **Image compression** for logos and attachments.
- **Environment configuration** via `.env.local` (e.g., Gemini API key for AI‑assisted invoice suggestions).
- **TypeScript** for type safety across the codebase.

## Architecture
- **Frontend** (`src/`):
  - `pages/` – React Router pages for Catalog, Create Invoice, History, Settings.
  - `components/` – Reusable UI components including `Layout` and `InvoicePDF`.
  - `lib/` – Utility functions (`utils.ts`) and Dexie database wrapper (`db.ts`).
  - `App.tsx` – Application entry point with routing.
- **Backend (optional)** (`server.js` – not included in the current repo but can be added) – Express server for API proxying or webhook handling.
- **Build System** – Vite for fast development and production bundling.
- **Styling** – Tailwind CSS with `tailwind-merge` for class‑name composition.

## Installation
```bash
# Clone the repository (or ensure you are in the project root)
git clone https://github.com/eiaiproject/Invois.git
cd Invois

# Install dependencies
npm install
```

## Configuration
Create a `.env.local` file (already present) and set required variables:
```
GEMINI_API_KEY=your_gemini_api_key_here
```
Additional environment variables can be added as needed.

## Development
```bash
# Start the development server on port 3000
npm run dev
```
Open `http://localhost:3000` in your browser. The Vite dev server provides hot‑module replacement for instant feedback.

## Building for Production
```bash
npm run build
# The compiled assets are placed in the `dist/` directory.
```
You can serve the `dist/` folder with any static file server (e.g., `npm i -g serve && serve -s dist`).

## Testing the PDF Generation
The `InvoicePDF` component uses `@react-pdf/renderer`. To preview the generated PDF, navigate to the *Create Invoice* page, fill in the details, and click **Export PDF**. The file will be downloaded as `invoice-<id>.pdf`.

## Database Schema
The client‑side database is defined in `src/lib/db.ts` using Dexie:
- **invoices** – Primary table storing invoice metadata (id, date, client information, totals).
- **items** – Child table for line items linked via `invoiceId`.
Both tables are indexed for fast queries. Dexie React hooks (`useLiveQuery`) keep UI in sync with the database.

## Utility Functions
- `src/lib/utils.ts` – Helper functions for date formatting, currency formatting, and ID generation (`nanoid`).
- Image compression is handled by `browser-image-compression` in the Settings page.

## Deployment
The app can be deployed to any static‑site hosting provider (Vercel, Netlify, GitHub Pages, etc.). Example Vercel configuration:
```json
{
  "builds": [{ "src": "vite.config.ts", "use": "@vercel/static-build" }],
  "routes": [{ "src": "/(.*)", "dest": "/index.html" }]
}
```
If a backend is required, deploy the Express server to a platform supporting Node.js and configure the frontend to point to the API URL via environment variables.

## Contributing
Contributions are welcome. Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Make your changes and ensure the TypeScript build passes (`npm run lint`).
4. Submit a pull request with a clear description of the changes.

## License
This project is licensed under the **MIT License**. See the `LICENSE` file for details.
