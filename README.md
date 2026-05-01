# Invois

## Overview
Invois is a web application that enables users to create, manage, and export invoices directly from the browser. The application is built with React 19, Vite, Tailwind CSS, and Dexie for client‑side IndexedDB storage. PDF generation is handled by `@react-pdf/renderer`. All data is stored locally, making the application usable offline without a backend server.

## New Capabilities
- **Customizable Thank You Message** – Users can now define their own closing message in the Settings page, which appears at the bottom of both PDF and plain‑text invoices.
- **Simplified Invoice Process** – Removed redundant fields (due date, buyer address, and store owner name) to streamline invoice creation and reduce clutter.
- **Clean Plain‑Text Export** – The markdown export has been optimized to remove unnecessary blank lines and literal newline characters, ensuring a clean copy when pasted into chat or email.
- **Copy‑to‑Clipboard Button** – After an invoice is saved, a *Salin Teks* button appears alongside the PDF download button, invoking the markdown export.

## Features
- Create invoices with automatic line‑item calculations (subtotal, discount, tax, grand total).
- Store invoice history locally using IndexedDB with reactive Dexie hooks.
- Export invoices as PDF documents with a professional layout.
- Responsive design that works across desktop and mobile devices.
- Settings page for logo upload and brand customization.
- Optional environment configuration for AI‑assisted suggestions via Gemini API.

## Architecture
- **src/pages** – React Router pages (`CreateInvoice`, `History`, `Catalog`, `Settings`).
- **src/components** – Reusable UI components, including `Layout` and `InvoicePDF`.
- **src/lib** – Utility functions (`utils.ts`) and Dexie database wrapper (`db.ts`).
- **src/App.tsx** – Application entry point with route definitions.
- **PDF Generation** – Implemented in `src/components/InvoicePDF.tsx` using `@react-pdf/renderer`.

## Installation
```bash
# Clone the repository and navigate to the project directory
git clone https://github.com/eiaiproject/Invois.git
cd Invois

# Install dependencies
npm install
```

## Configuration
Create a `.env.local` file at the project root if you need to provide a Gemini API key for AI features:
```
GEMINI_API_KEY=your_gemini_api_key_here
```
Additional environment variables can be added as required.

## Development
```bash
npm run dev
```
The development server runs on port 3000 by default. Open `http://localhost:3000` in a browser to use the application.

## Production Build
```bash
npm run build
```
The compiled assets are placed in the `dist/` directory and can be served with any static‑file server, for example:
```bash
npx serve -s dist
```

## PDF Generation
The `InvoicePDF` component generates a PDF that includes:
- Company branding (logo or brand name).
- Client name and invoice details.
- Itemised table with description, quantity, unit price, and total.
- Subtotal, discount, tax, and grand total calculations.
- Payment method section (if configured).
- User‑defined thank you message.

## Database Schema
The client‑side database is defined in `src/lib/db.ts` using Dexie:
- **invoices** – Stores invoice metadata, client information, dates, totals, and notes.
- **catalog** – Holds reusable product/service entries for quick selection.
Both tables are indexed for efficient queries, and Dexie React hooks keep the UI synchronized with the data.

## Utility Functions
- `formatCurrency` – Formats numbers as Indonesian Rupiah.
- `generateInvoiceNumber` – Generates sequential invoice numbers based on a prefix.
- `invoiceToMarkdown` – Converts an invoice and profile data into a markdown string that can be copied to the clipboard. This function is used by the *Salin Teks* button.
- `cn` – Utility for merging Tailwind class names.

## Contributing
Contributions are welcome. Follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Implement your changes and ensure the TypeScript build passes (`npm run lint`).
4. Commit with a concise message and push to your fork.
5. Open a pull request describing the changes.

## License
The project is licensed under the MIT License. See the `LICENSE` file for details.
