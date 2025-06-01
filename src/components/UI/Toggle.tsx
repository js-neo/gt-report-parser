// src/components/UI/Toggle.tsx
'use client';

import * as React from 'react';
import { cn } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    pressed: boolean;
    onPressedChange: (pressed: boolean) => void;
    withIcon?: boolean;
    iconOn?: React.ReactNode;
    iconOff?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ className, pressed, onPressedChange, withIcon = false, iconOn, iconOff, size = 'md', ...props }, ref) => {
        const sizeClasses = {
            sm: 'h-6 w-12',
            md: 'h-8 w-16',
            lg: 'h-10 w-20'
        };

        const knobSize = {
            sm: 'h-5 w-5',
            md: 'h-7 w-7',
            lg: 'h-9 w-9'
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'relative inline-flex items-center justify-center rounded-full transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                    'disabled:pointer-events-none disabled:opacity-50',
                    'overflow-hidden',
                    pressed
                        ? 'bg-blue-500 dark:bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700',
                    sizeClasses[size],
                    className
                )}
                data-state={pressed ? 'on' : 'off'}
                onClick={() => onPressedChange(!pressed)}
                {...props}
            >
                <AnimatePresence>
                    {pressed && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600"
                        />
                    )}
                </AnimatePresence>

                <motion.span
                    className={cn(
                        'absolute left-1 top-1/2 -translate-y-1/2 transform',
                        'rounded-full bg-white shadow-lg',
                        'flex items-center justify-center',
                        'z-10',
                        knobSize[size]
                    )}
                    initial={false}
                    animate={{
                        x: pressed
                            ? size === 'sm' ? 22 : size === 'md' ? 30 : 38
                            : 0,
                        rotate: pressed ? 360 : 0
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30
                    }}
                >
                    {withIcon && (
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={pressed ? 'on' : 'off'}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center justify-center"
                            >
                                {pressed ? iconOn : iconOff}
                            </motion.span>
                        </AnimatePresence>
                    )}
                </motion.span>

                {pressed && (
                    <motion.span
                        className="absolute inset-0 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    />
                )}
            </button>
        );
    }
);

Toggle.displayName = 'Toggle';