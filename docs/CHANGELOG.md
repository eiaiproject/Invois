# Changelog

## [2026-05-01] - Sales Recapitulation & UX Feedback

### Added
- **Sales Recapitulation:** Added a summary dashboard in the History tab displaying Total Revenue, Total Volume, and Average Transaction Value.
- **Copy Feedback:** Implemented visual confirmation (icon change and "Tersalin!" text) when copying invoice text in both Create and History pages.
- **Theme Toggle:** Added a manual switch between Light and Dark modes in the header for improved accessibility.
- **History Tab Copy Feature:** Added "Salin Teks" button in the History tab to allow quick copying of invoice data in markdown format.
- **PDF Alignment:** Centered brand logo and information for a more professional appearance.

### Changed
- **Invoice Creation Workflow:**
    - Renamed "Buat Invoice" to "buat invoice".
    - Removed "Tanggal Jatuh Tempo" field to streamline the process.
    - Repositioned "Tgl Terbit" adjacent to "Nomor Invoice".
- **UI Consistency:** Changed "Subtotal" label to "Total" in the items list for better clarity.
- **PDF Layout:** 
    - Adjusted vertical spacing between brand address and contact details.
    - Optimized proportional spacing for brand information.
- **History Tab:** Renamed title to "riwayat invoice".

### Removed
- **Due Date Logic:** Removed `dueDate` state and property from invoice creation and storage.

### Changed
- **Invoice Creation Workflow:**
    - Renamed "Buat Invoice" to "buat invoice".
    - Removed "Tanggal Jatuh Tempo" field to streamline the process.
    - Repositioned "Tgl Terbit" adjacent to "Nomor Invoice".
- **UI Consistency:** Changed "Subtotal" label to "Total" in the items list for better clarity.
- **PDF Layout:** 
    - Adjusted vertical spacing between brand address and contact details.
    - Optimized proportional spacing for brand information.
- **History Tab:** Renamed title to "riwayat invoice".

### Removed
- **Due Date Logic:** Removed `dueDate` state and property from invoice creation and storage.
