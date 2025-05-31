// src/components/UI/Label.tsx
'use client';

import * as React from 'react';
import { cn } from '@/utils';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => {
        return (
            <label
                ref={ref}
                className={cn(
                    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                    className
                )}
                {...props}
            />
        );
    }
);

Label.displayName = 'Label';