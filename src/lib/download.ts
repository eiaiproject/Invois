/** Trigger a browser download for a blob, Safari-safe. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke late: revoking immediately after click() can cancel the download
  // in some browsers (notably Safari).
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
