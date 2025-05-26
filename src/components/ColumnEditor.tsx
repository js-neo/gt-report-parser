// src/components/ColumnEditor.tsx

import { useCallback, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { X, GripVertical } from 'lucide-react';
import type { ColumnConfig } from '@/lib/types';
import { cn } from '@/utils';
import { motion } from 'framer-motion';

interface ColumnEditorProps {
    columns: ColumnConfig[];
    onChange: (columns: ColumnConfig[]) => void;
}

interface DragItem {
    index: number;
    type: string;
}

const DraggableColumn = ({
                             column,
                             index,
                             onChange,
                             onRemove,
                             moveColumn,
                         }: {
    column: ColumnConfig;
    index: number;
    onChange: (id: string, name: string) => void;
    onRemove: (id: string) => void;
    moveColumn: (from: number, to: number) => void;
}) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag({
        type: 'COLUMN',
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop<DragItem>({
        accept: 'COLUMN',
        hover: (item, monitor) => {
            if (!ref.current) return;

            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset()!;
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

            moveColumn(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    drag(drop(ref));

    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
                'flex items-center gap-2 p-2 border rounded bg-background',
                'transition-shadow duration-200 ease-in-out',
                isDragging ? 'shadow-lg opacity-50' : 'shadow-sm opacity-100',
                'hover:shadow-md'
            )}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            <div className="cursor-grab active:cursor-grabbing hover:text-primary">
                <GripVertical className="h-4 w-4" />
            </div>

            <Input
                value={column.name}
                onChange={(e) => onChange(column.id, e.target.value)}
                className="flex-1 bg-background transition-all duration-200 hover:bg-gray-50"
                aria-label={`Edit column name: ${column.name}`}
            />

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(column.id)}
                aria-label={`Remove column: ${column.name}`}
                className="p-1 h-auto hover:bg-red-50 hover:text-red-600 transition-colors"
            >
                <X className="h-4 w-4" />
            </Button>
        </motion.div>
    );
};

export const ColumnEditor = ({ columns, onChange }: ColumnEditorProps) => {
    const moveColumn = useCallback(
        (fromIndex: number, toIndex: number) => {
            const newColumns = [...columns];
            const [removed] = newColumns.splice(fromIndex, 1);
            newColumns.splice(toIndex, 0, removed);
            onChange(newColumns);
        },
        [columns, onChange]
    );

    const handleNameChange = useCallback(
        (id: string, name: string) => {
            onChange(
                columns.map((col) =>
                    col.id === id ? { ...col, name } : col
                )
            );
        },
        [columns, onChange]
    );

    const handleRemove = useCallback(
        (id: string) => {
            onChange(columns.filter((col) => col.id !== id));
        },
        [columns, onChange]
    );

    return (
        <div className="space-y-4">
            <div className="border-b pb-2">
                <h2 className="text-lg font-semibold">Настройка столбцов</h2>
                <p className="text-sm text-muted-foreground">
                    Перетащите, чтобы изменить порядок, переименуйте или удалите столбцы.
                </p>
            </div>

            <motion.div className="space-y-2" layout>
                {columns.map((column, index) => (
                    <DraggableColumn
                        key={column.id}
                        column={column}
                        index={index}
                        onChange={handleNameChange}
                        onRemove={handleRemove}
                        moveColumn={moveColumn}
                    />
                ))}
            </motion.div>

            {columns.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4 text-muted-foreground"
                >
                    Нет доступных столбцов
                </motion.div>
            )}
        </div>
    );
};