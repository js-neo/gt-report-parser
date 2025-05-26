// src/lib/types.ts

export interface ExcelData {
    headers: string[];
    rows: Record<string, unknown>[];
}

export interface ColumnConfig {
    id: string;
    name: string;
    visible: boolean;
}

