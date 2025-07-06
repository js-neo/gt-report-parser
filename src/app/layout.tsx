// src/app/layout.tsx

import type {Metadata} from "next";
import {GeistSans} from 'geist/font/sans';
import {GeistMono} from 'geist/font/mono';
import "./globals.css";
import DndProviderWrapper from "@/components/DndProviderWrapper";
import {ThemeProvider} from "@/components/ThemeProvider";
import React from "react";

export const metadata: Metadata = {
    title: "GT Report Processor",
    description: "Advanced Excel report processing application",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`} suppressHydrationWarning>
        <body>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <DndProviderWrapper>
                {children}
            </DndProviderWrapper>
        </ThemeProvider>
        </body>
        </html>
    );
}