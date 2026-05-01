# 📄 Invois

Invois is a high-performance, professional client-side web application designed for creating, managing, and exporting invoices with precision and ease. Built for freelancers, consultants, and small business owners, Invois eliminates the need for complex backend infrastructure by leveraging modern browser capabilities for data persistence and PDF generation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)](https://tailwindcss.com/)
[![Dexie.js](https://img.shields.io/badge/Dexie.js-IndexedDB-orange)](https://dexie.org/)

---

## ✨ Key Features

### 🚀 Streamlined Invoice Creation
An intuitive workflow that handles the heavy lifting. Automatic calculations for:
- **Subtotals** based on quantity and unit price.
- **Discounts** (Percentage or Nominal).
- **Tax (PPN)** calculations with toggleable options.
- **Grand Totals** calculated in real-time.

### 🔐 Privacy-First Architecture
Your financial data is sensitive. Invois uses **Dexie.js** to store all information locally within the browser's **IndexedDB**. 
- No cloud storage.
- No account creation required.
- Full offline availability.
- Total data ownership.

### 📄 Professional PDF Export
Generate industry-standard PDFs using `@react-pdf/renderer`.
- **Custom Branding:** Integration of company logo and brand colors.
- **Clean Layout:** Professionally aligned headers, itemized tables, and clear totals.
- **Multi-Format:** Download as PDF or copy as a clean Markdown summary for quick sharing, now with visual copy confirmation.

### 📦 Catalog Management
Speed up your billing process by maintaining a reusable catalog of services and products, reducing repetitive data entry.

### 📊 Sales Recapitulation
Track your business growth with the built-in sales summary in the History tab.
- **Total Revenue:** Instant calculation of all issued invoices.
- **Total Volume:** Total count of transactions.
- **Average Transaction Value:** Insight into your average deal size.

### 🎨 Brand & Appearance Control
- **Customization:** Set brand names, contact details, and accent colors.
- **Theme Support:** Native support for **Light and Dark modes**, respecting system preferences with a manual override.
- **Responsive Design:** A mobile-first approach ensuring a seamless experience across smartphones, tablets, and desktops.

---

## 🛠 Technical Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript | UI Logic & Component Architecture |
| **Styling** | Tailwind CSS | Utility-first Responsive Design |
| **Build Tool** | Vite | Next-generation Frontend Tooling |
| **Database** | Dexie.js (IndexedDB) | Reactive Client-side Storage |
| **PDF Engine** | @react-pdf/renderer | Client-side PDF Generation |
| **Icons** | Lucide-react | Consistent Visual Iconography |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (Latest LTS recommended)
- **npm** or **yarn**

### Installation
```bash
# Clone the repository
git clone https://github.com/eiaiproject/Invois.git
cd Invois

# Install dependencies
npm install

# Start development server
npm run dev
```
The application will be available at `http://localhost:5173` (default Vite port).

### Production Build
```bash
# Generate optimized production build
npm run build

# Preview the build locally
npm run preview
```

---

## 📂 Project Structure

```text
src/
├── components/       # Shared UI components (Layout, PDF Engine)
├── lib/              # Core business logic (DB Schema, Formatting Utils)
├── pages/            # Main views (Invoice Creator, History, Catalog, Settings)
├── App.tsx           # Application routing & state
└── main.tsx          # Entry point
```

---

## 📝 Documentation
Detailed technical insights and version history can be found in the `/docs` directory:
- [CHANGELOG.md](docs/CHANGELOG.md) - History of updates and bug fixes.

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
