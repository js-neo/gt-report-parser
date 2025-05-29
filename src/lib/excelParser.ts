// src/lib/excelParser.ts

import ExcelJS from 'exceljs';
import type { ExcelData, ColumnConfig, ProcessedData } from './types';

const adjustForMoscowTime = (date: Date): Date => {
    const moscowOffset = 3 * 60 * 60 * 1000;
    return new Date(date.getTime() + moscowOffset);
};

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) throw new Error('Листы не найдены');

    const headers: string[] = [];
    const rows: Record<string, unknown>[] = [];

    worksheet.getRow(1).eachCell((cell) => {
        headers.push(cell.text);
    });

    const isTimeColumn = headers.map(header =>
        header.toLowerCase().includes('время')
    );

    console.log("isTimeColumn: ", isTimeColumn);

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            const isTimeCol = isTimeColumn[colNumber - 1];

            if (isTimeCol) {
                if (cell.type === ExcelJS.ValueType.Date) {
                    const dateValue = cell.value as Date;
                    rowData[header] = adjustForMoscowTime(dateValue);
                }
                else if (typeof cell.value === 'number' && cell.value > 10000) {
                    try {
                        const excelDate = new Date((cell.value - 25569) * 86400 * 1000);
                        rowData[header] = adjustForMoscowTime(excelDate);
                    } catch {
                        rowData[header] = cell.value;
                    }
                }
                else if (typeof cell.value === 'string' && cell.value.match(/\d{4}-\d{2}-\d{2}/)) {
                    try {
                        const dateValue = new Date(cell.value);
                        if (!isNaN(dateValue.getTime())) {
                            rowData[header] = adjustForMoscowTime(dateValue);
                        } else {
                            rowData[header] = cell.value;
                        }
                    } catch {
                        rowData[header] = cell.value;
                    }
                }
                else {
                    rowData[header] = cell.value;
                }
            } else {
                rowData[header] = cell.value;
            }
        });
        rows.push(rowData);
    });

    return { headers, rows };
};

export const processExcelData = async (
    data: ExcelData,
    columns: ColumnConfig[]
): Promise<void> => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Processed Data');

    const isTimeColumn = columns.map(col =>
        col.name.toLowerCase().includes('время')
    );

    worksheet.addRow(columns.map(c => c.name));

    data.rows.forEach(row => {
        const processedRow = columns.map((config, index) => {
            if (!config.visible) return null;

            const value = row[config.id];
            return isTimeColumn[index] && value instanceof Date
                ? adjustForMoscowTime(value)
                : value;
        });
        worksheet.addRow(processedRow);
    });

    await workbook.xlsx.writeBuffer();
};

export const exportToExcel = async (data: ProcessedData, fileName: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');
    const isTimeColumn = data.headers.map(header =>
        header.toLowerCase().includes('время')
    );

    worksheet.addRow(data.headers);

    data.rows.forEach(row => {
        const rowData = data.headers.map((header, index) => {
            const value = row[header];
            return isTimeColumn[index] && value instanceof Date
                ? adjustForMoscowTime(value)
                : value;
        });
        worksheet.addRow(rowData);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.xlsx`;
    a.click();

    URL.revokeObjectURL(url);
};