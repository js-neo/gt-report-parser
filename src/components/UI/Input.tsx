// src/components/UI/Input.tsx
'use client';

import React from 'react';
import { cn } from "@/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    "w-full p-2 border rounded-md bg-white dark:bg-gray-700",
                    "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100",
                    "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none",
                    "disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed",
                    "transition-colors duration-200",
                    className
                )}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';