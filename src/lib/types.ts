// src/lib/types.ts

export type RowWithSapsanFlag = Record<string, unknown> & { _isSapsan?: boolean, _isValueError?: boolean };

export interface ExcelData {
    headers: string[];
    rows: Record<string, unknown>[];
}

export interface ColumnConfig {
    id: string;
    name: string;
    visible: boolean;
}

export interface ProcessedData {
    headers: string[];
    rows: RowWithSapsanFlag[];
    initialSort?: {
        key: string;
        direction: 'asc' | 'desc';
    };
}

export interface ExcelParser {
    parseExcelFile: (file: File) => Promise<ExcelData>;
    processExcelData: (data: ExcelData, columns: ColumnConfig[]) => Promise<void>;
    exportToExcel: (data: ProcessedData, fileName: string) => Promise<void>;
}