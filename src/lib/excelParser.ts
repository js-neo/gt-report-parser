// src/lib/excelParser.ts

import ExcelJS from 'exceljs';
import type { ExcelData, ColumnConfig } from './types';

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

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
            rowData[headers[colNumber - 1]] = cell.value;
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

    worksheet.addRow(columns.map(c => c.name));

    data.rows.forEach(row => {
        const processedRow = columns.map(config => {
            return config.visible ? row[config.id] : null;
        });
        worksheet.addRow(processedRow);
    });

    const buffer = await workbook.xlsx.writeBuffer();
};