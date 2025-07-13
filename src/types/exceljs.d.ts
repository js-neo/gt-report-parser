import 'exceljs';

declare module 'exceljs' {
    interface Row {
        _isSapsan?: boolean;
        _isValueError?: boolean;
        _isAddressError?: boolean;
    }
}