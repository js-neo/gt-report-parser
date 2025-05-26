// src/utils/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Объединяет классы с поддержкой:
 * - Условных выражений
 * - Темной темы (dark: классов)
 * - Автоматического разрешения конфликтов Tailwind
 *
 * @example
 * cn('p-2', active && 'p-4', 'bg-red-500 dark:bg-red-800')
 * → 'p-4 bg-red-500 dark:bg-red-800'
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}