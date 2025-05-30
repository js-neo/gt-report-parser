// tailwind.config.ts

import type { Config } from "tailwindcss";

export default {
    darkMode: 'class',
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}'
    ],
    theme: {
        extend: {
            colors: {
                background: ({
                                 opacityVariable,
                                 opacityValue
                             }: {
                    opacityVariable?: string;
                    opacityValue?: string;
                }) => {
                    if (opacityValue !== undefined) {
                        return `rgba(var(--background), ${opacityValue})`
                    }
                    if (opacityVariable !== undefined) {
                        return `rgba(var(--background), var(${opacityVariable}, 1))`
                    }
                    return `rgb(var(--background))`
                },
                foreground: ({
                                 opacityVariable,
                                 opacityValue
                             }: {
                    opacityVariable?: string;
                    opacityValue?: string;
                }) => {
                    if (opacityValue !== undefined) {
                        return `rgba(var(--foreground), ${opacityValue})`
                    }
                    if (opacityVariable !== undefined) {
                        return `rgba(var(--foreground), var(${opacityVariable}, 1))`
                    }
                    return `rgb(var(--foreground))`
                },
                border: ({
                             opacityVariable,
                             opacityValue
                         }: {
                    opacityVariable?: string;
                    opacityValue?: string;
                }) => {
                    if (opacityValue !== undefined) {
                        return `rgba(var(--border), ${opacityValue})`
                    }
                    if (opacityVariable !== undefined) {
                        return `rgba(var(--border), var(${opacityVariable}, 1))`
                    }
                    return `rgb(var(--border))`
                },
            },
        },
    },
    plugins: [],
} satisfies Config;