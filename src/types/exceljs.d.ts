import 'exceljs';

declare module 'exceljs' {
    interface Row {
        _isSapsan?: boolean;
    }
}