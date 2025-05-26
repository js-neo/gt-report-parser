// src/components/Common/LoadingSpinner.tsx
'use client';

import { cn } from "@/utils";

interface LoadingSpinnerProps {
    small?: boolean;
    className?: string;
}

export default function LoadingSpinner({ small = false, className }: LoadingSpinnerProps) {
    const sizeClasses = small
        ? 'h-4 w-4 border-2'
        : 'h-8 w-8 border-4';

    return (
        <div className={cn(
            "inline-block animate-spin rounded-full border-solid border-current border-r-transparent",
            sizeClasses,
            className
        )}>
            <span className="sr-only">Загрузка...</span>
        </div>
    );
}