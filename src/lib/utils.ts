import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('id-ID', options || {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
