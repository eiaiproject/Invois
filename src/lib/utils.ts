import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function generateInvoiceNumber(prefix: string, lastDailyCount: number = 0): string {
  // Simple format: [PREFIX]-[4 Digit Number based on total count]
  // In a robust system this might need more complexity, but for MVP keep it simple.
  const padding = String(lastDailyCount + 1).padStart(4, '0');
  return `${prefix}-${padding}`;
}
