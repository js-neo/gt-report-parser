// src/components/UI/Toggle.tsx
'use client';

import * as React from 'react';
import { cn } from '@/utils';

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    pressed: boolean;
    onPressedChange: (pressed: boolean) => void;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ className, pressed, onPressedChange, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    'disabled:pointer-events-none disabled:opacity-50',
                    'data-[state=on]:bg-blue-600 data-[state=on]:text-white',
                    'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
                    'h-10 px-3',
                    className
                )}
                data-state={pressed ? 'on' : 'off'}
                onClick={() => onPressedChange(!pressed)}
                {...props}
            />
        );
    }
);

Toggle.displayName = 'Toggle';