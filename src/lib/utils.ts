import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * SOVEREIGN CLASS MERGING UTILITY (v7.1.11)
 * High-performance class merging for the industrial design system.
 */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
