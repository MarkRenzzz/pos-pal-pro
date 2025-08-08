import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPHP(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(isNaN(num as number) ? 0 : (num as number));
  } catch {
    const safe = typeof num === 'number' && !isNaN(num) ? num : 0;
    return `₱${safe.toFixed(2)}`;
  }
}
