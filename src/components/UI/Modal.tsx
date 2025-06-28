// src/components/UI/Modal.tsx
'use client';

import { Dialog } from '@headlessui/react';
import React from "react";
import { cn } from "@/utils";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
    isOpen: boolean;
    onCloseAction: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
    showCloseButton?: boolean;
    maxHeight?: string;
}

export const Modal = ({
                          isOpen,
                          onCloseAction,
                          title,
                          children,
                          className = '',
                          size = 'md',
                          showCloseButton = true,
                          maxHeight = '90vh',
                      }: ModalProps) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        full: 'max-w-full',
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onCloseAction}
            className="relative z-50"
        >
            <div
                className="fixed inset-0 bg-black/30 dark:bg-black/50"
                aria-hidden="true"
            />

            <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
                <Dialog.Panel
                    className={cn(
                        "w-full rounded-lg bg-white dark:bg-gray-800 shadow-xl",
                        "transform transition-all duration-200 ease-in-out",
                        "flex flex-col",
                        sizeClasses[size],
                        className
                    )}
                    style={{ maxHeight }}
                >
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title
                            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                        >
                            {title}
                        </Dialog.Title>

                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={onCloseAction}
                                className={cn(
                                    "rounded-md p-1 text-gray-400 hover:text-gray-500",
                                    "dark:text-gray-400 dark:hover:text-gray-300",
                                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                                )}
                                aria-label="Закрыть"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 ">
                        {children}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};