# 📖 User Guide - Invois

Welcome to Invois! This guide will help you get the most out of the application.

## 1. Getting Started
Upon opening Invois, the first thing you should do is configure your brand identity. Navigate to the **Settings** tab to:
- Upload your company logo.
- Set your brand name and contact information.
- Define your **Invoice Prefix** (e.g., `INV-`) to keep your numbering organized.
- Choose a **Brand Color** that matches your business identity.

## 2. Creating an Invoice
1. Go to the **Create Invoice** page.
2. **Client Information:** Enter the client's name. If you have billed this client before, Invois will provide suggestions from your history.
3. **Invoice Details:** The invoice number is generated automatically based on your prefix and today's count, but you can edit it manually.
4. **Items List:** 
   - Add items manually or select them from your **Catalog**.
   - Specify quantity and unit price.
   - Use the trash icon to remove items.
5. **Calculations:**
   - Toggle **PPN (Tax)** if applicable and set the percentage.
   - Add a **Discount** (either a fixed nominal amount or a percentage).
6. **Notes:** Add any special instructions or payment terms in the Notes section.
7. **Save & Generate:** Click "Simpan & Generate PDF" to save the invoice to your local history and open the PDF download link.

## 3. Managing the Catalog
The Catalog is designed to save you time. Instead of typing the same service or product repeatedly:
- Go to the **Catalog** tab.
- Add your most common items and their standard prices.
- When creating an invoice, simply start typing the item name, and select it from the suggestions.

## 4. Invoice History
The **History** tab allows you to:
- **View Sales Summary:** Get an instant overview of your total revenue, total number of invoices, and average transaction value.
- Review all previously issued invoices.
- Re-download the PDF for any past invoice.
- Copy the invoice summary as text for quick sharing (with a visual confirmation when copied).
- Delete old invoices to keep your storage clean.

## 5. Data Privacy & Storage
**Important:** Invois is a client-side application. 
- Your data is stored in your browser's **IndexedDB**.
- If you clear your browser's site data/cache, your invoices and catalog will be deleted.
- We recommend periodically exporting your invoices to PDF for permanent archiving.

## 6. Theme Customization
You can switch between **Light Mode** and **Dark Mode** using the toggle in the header. The application also supports system preferences automatically.
