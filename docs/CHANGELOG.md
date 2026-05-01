# Changelog

## [2026-05-01] - UI/UX Improvements & PDF Refinement

### Added
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
