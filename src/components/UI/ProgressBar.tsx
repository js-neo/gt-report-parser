// src/components/UI/ProgressBar.tsx
'use client';

import { cn } from '@/utils';

interface ProgressBarProps {
    value: number;
    className?: string;
}

export const ProgressBar = ({ value, className }: ProgressBarProps) => {
    return (
        <div className={cn("h-2 w-full bg-gray-200 rounded-full", className)}>
            <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${value}%` }}
            />
        </div>
    );
};