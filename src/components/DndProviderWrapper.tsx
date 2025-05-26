// src/components/DndProviderWrapper.tsx

'use client';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { type PropsWithChildren } from 'react';

export default function DndProviderWrapper({ children }: PropsWithChildren) {
    return (
        <DndProvider backend={HTML5Backend}>
            {children}
        </DndProvider>
    );
}