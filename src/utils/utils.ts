// src/utils/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parse } from 'date-fns';

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

export const formatDateTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return String(date);

    const correctedDate = new Date(d);
    correctedDate.setHours(correctedDate.getHours());

    const day = String(correctedDate.getDate()).padStart(2, '0');
    const month = String(correctedDate.getMonth() + 1).padStart(2, '0');
    const year = correctedDate.getFullYear();
    const hours = String(correctedDate.getHours()).padStart(2, '0');
    const minutes = String(correctedDate.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
};

export const parseDateTime = (value: unknown): Date => {
    if (value instanceof Date) return value;

    const strValue = String(value || '');
    try {
        const formats = [
            'dd.MM.yyyy HH:mm',
            'yyyy-MM-dd HH:mm:ss',
            'yyyy-MM-dd\'T\'HH:mm:ss',
            'MM/dd/yyyy HH:mm'
        ];

        for (const format of formats) {
            const parsed = parse(strValue, format, new Date());
            if (!isNaN(parsed.getTime())) {
                parsed.setHours(parsed.getHours());
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Ошибка обработки даты:', e);
    }

    return new Date(0);
};