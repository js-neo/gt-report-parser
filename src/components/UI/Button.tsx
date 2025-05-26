// src/components/UI/Button.tsx
'use client';

import { cn } from "@/utils";
import React from "react";
import LoadingSpinner from "@/components/Common/LoadingSpinner";

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    children: React.ReactNode;
    isLoading?: boolean;
    loadingText?: string;
    tooltip?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({
         variant = 'primary',
         size = 'md',
         className,
         children,
         disabled,
         isLoading = false,
         loadingText,
         tooltip,
         ...props
     }, ref) => {
        const baseStyles = cn(
            "w-full rounded-md font-medium",
            "inline-flex justify-center items-center",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800",
            "transition-all duration-200 ease-in-out",
            "disabled:cursor-not-allowed",
            "text-center"
        );

        const sizeStyles = {
            sm: "px-3 py-1.5 text-sm",
            md: "px-4 py-2 text-base",
            lg: "px-6 py-3 text-lg",
        };

        const variantStyles = {
            primary: cn(
                "bg-blue-600 text-white hover:bg-blue-700",
                "dark:bg-blue-700 dark:hover:bg-blue-800"
            ),
            secondary: cn(
                "bg-gray-100 text-gray-800 hover:bg-gray-200",
                "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            ),
            danger: cn(
                "bg-red-600 text-white hover:bg-red-700",
                "dark:bg-red-700 dark:hover:bg-red-800"
            ),
            outline: cn(
                "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50",
                "dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            ),
            ghost: cn(
                "hover:bg-gray-100 text-gray-700",
                "dark:hover:bg-gray-700 dark:text-gray-200"
            ),
        };

        const disabledStyles = cn(
            "opacity-70",
            variant === 'outline' && "border-gray-200 dark:border-gray-700",
            variant === 'ghost' && "hover:bg-transparent dark:hover:bg-transparent"
        );

        const spinnerColor = variant === 'outline' || variant === 'ghost'
            ? "text-current"
            : "text-white";

        const isSimpleContent = typeof children === 'string' || React.Children.count(children) === 1;

        return (
            <div className={cn(
                "relative",
                className?.includes('w-full') ? "w-full" : "inline-block",
                "group"
            )}>
                <button
                    ref={ref}
                    className={cn(
                        baseStyles,
                        sizeStyles[size],
                        variantStyles[variant],
                        (disabled || isLoading) && disabledStyles,
                        !isSimpleContent && "!justify-start !items-start !text-left",
                        className
                    )}
                    disabled={disabled || isLoading}
                    aria-disabled={disabled || isLoading}
                    {...props}
                >
                    {isLoading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                            <LoadingSpinner small className={spinnerColor} />
                            <span className="text-center">{loadingText || children}</span>
                        </span>
                    ) : isSimpleContent ? (
                        children
                    ) : (
                        <div className="w-full flex flex-col gap-1">
                            {children}
                        </div>
                    )}
                </button>

                {tooltip && (disabled || isLoading) && (
                    <div className={cn(
                        "absolute z-10 invisible group-hover:visible bottom-full left-1/2",
                        "transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap",
                        "bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-200",
                        "shadow-lg transition-opacity duration-200"
                    )} role="tooltip">
                        {tooltip}
                        <div className="absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800 dark:border-b-gray-700"></div>
                    </div>
                )}
            </div>
        );
    }
);

Button.displayName = 'Button';