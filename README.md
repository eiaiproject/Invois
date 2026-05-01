# Invois

## Overview
Invois is a professional, client-side web application for creating, managing, and exporting invoices. Built with **React 19**, **Vite**, **Tailwind CSS**, and **Dexie.js**, it provides a seamless experience for freelancers and small business owners to generate professional invoices without needing a backend server. All data is stored locally in the browser's IndexedDB, ensuring privacy and offline availability.

## Key Features
- **Streamlined Invoice Creation:** Fast and intuitive workflow for creating invoices with automatic calculations for subtotal, discounts, tax (PPN), and grand totals.
- **Local Storage & Privacy:** Uses Dexie.js for reactive client-side storage. Your data never leaves your device.
- **Professional PDF Export:** Generates clean, professionally formatted PDFs using `@react-pdf/renderer`.
- **Multi-Format Export:** Supports both PDF download and a "Copy to Clipboard" markdown format for easy sharing via chat or email.
- **Brand Customization:** Settings page for uploading logos, setting brand colors, and customizing "Thank You" messages.
- **Appearance Control:** Support for Light and Dark modes, following system preferences with a manual toggle for user convenience.
- **Catalog Management:** Store reusable items/services to speed up the invoice creation process.
- **Responsive Design:** Fully optimized for desktop and mobile devices.

## Recent Updates
- **Optimized UX:** Removed redundant fields like "Due Date" to focus on essential billing information.
- **Enhanced PDF Layout:** Improved brand alignment (centered logo and info) and proportional vertical spacing for a more polished look.
- **Quick History Access:** Added a "Copy Text" feature directly in the invoice history tab for rapid retrieval of invoice details.

## Architecture
- **`src/pages`**: Application views (`CreateInvoice`, `History`, `Catalog`, `Settings`).
- **`src/components`**: Core UI elements, including the `InvoicePDF` engine and `Layout` wrapper.
- **`src/lib`**: Business logic and data layer (`db.ts` for Dexie schema, `utils.ts` for formatting and markdown generation).
- **`src/App.tsx`**: Routing and application state management.

## Installation & Setup
```bash
# Clone the repository
git clone https://github.com/eiaiproject/Invois.git
cd Invois

# Install dependencies
npm install

# Start development server
npm run dev
```
The application runs on `http://localhost:3000` by default.

## Production Deployment
```bash
# Build the project
npm run build

# Serve the dist folder
npx serve -s dist
```

## Technical Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS.
- **Build Tool:** Vite.
- **Database:** Dexie.js (IndexedDB).
- **PDF Engine:** @react-pdf/renderer.
- **Icons:** Lucide-react.

## Documentation
For a detailed list of changes and version history, please refer to [docs/CHANGELOG.md](docs/CHANGELOG.md).

## License
This project is licensed under the MIT License.
