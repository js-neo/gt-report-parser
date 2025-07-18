// src/lib/excelParser.ts

import ExcelJS, {Row} from 'exceljs';
import Papa from 'papaparse';
import type {ExcelData, ColumnConfig, ProcessedData} from './types';
import {parseDateTime} from "@/utils";

const adjustForMoscowTime = (date: Date): Date => {
    const moscowOffset = 3 * 60 * 60 * 1000;
    return new Date(date.getTime() - moscowOffset);
};

const widthColumns = [
    {key: 'Номер заказа', width: 130},
    {key: 'Время заказа', width: 230},
    {key: 'Текущий статус', width: 230},
    {key: 'Стоимость', width: 160},
    {key: 'Сумма клиента', width: 150},
    {key: 'Заказчик', width: 270},
    {key: 'Адрес', width: 680},
    {key: 'Исполнитель', width: 270},
    {key: 'Автомобиль', width: 270},
    {key: 'Комментарий', width: 680},
    {key: 'Клиент', width: 270},
    {key: 'Парк партнёр', width: 270},
    {key: 'Доплата', width: 270},
];

const numericColumns = ['Стоимость', 'Сумма клиента', 'Доплата'];

const isNumericColumn = (header: string) => {
    return numericColumns.some(numericHeader =>
        header.toLowerCase().includes(numericHeader.toLowerCase())
    );
};

const applyWorksheetFormatting = (worksheet: ExcelJS.Worksheet, headers: string[]) => {

    headers.forEach((header, index) => {
        const widthConfig = widthColumns.find(w => header.includes(w.key));
        worksheet.getColumn(index + 1).width = widthConfig ? widthConfig.width / 12 : 20;
        if (isNumericColumn(header)) {
            worksheet.getColumn(index + 1).numFmt = '#,##0.00';
            console.log(`worksheet.getColumn(${index + 1}): `, worksheet.getColumn(index + 1));
            console.log(`worksheet.getColumn(${index + 1}).numFmt: `, worksheet.getColumn(index + 1).numFmt);
        }
    });

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.font = {
            bold: true,
            size: 10,
            name: 'Calibri'
        };
        cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
        };
        cell.border = {
            top: {style: 'thin'},
            left: {style: 'thin'},
            bottom: {style: 'thin'},
            right: {style: 'thin'}
        };
    });

    worksheet.eachRow((row: Row, rowNumber) => {
        if (rowNumber === 1) return;
        const isSapsan = row._isSapsan === true;
        const isValueError = row._isValueError === true;
        const isAddressError = row._isAddressError === true;
        const rowFillColor =
            isValueError ? 'FFFFCCCC' :
            isSapsan ? 'FFE6FFE6' :
            isAddressError ? 'FFFFB366' :
            'FFFFFFFF';

        row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];

            if (cell.value === null || cell.value === undefined || cell.value === '' ||
                (typeof cell.value === 'string' && cell.value.trim() === '')) {
                cell.value = isNumericColumn(header) ? 0 : '';
            }

            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {argb: rowFillColor}
            };
            cell.font = {
                size: 10,
                name: 'Calibri'
            };
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true
            };
            cell.border = {
                top: {style: 'thin'},
                left: {style: 'thin'},
                bottom: {style: 'thin'},
                right: {style: 'thin'}
            };
        });
    });
};

export const parseCSVFile = async (file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const buffer = reader.result as ArrayBuffer;
                const decoderWin1251 = new TextDecoder('windows-1251');
                let csvData = decoderWin1251.decode(buffer);

                const isRussianTextPresent = /[а-яА-Я]/.test(csvData);

                if (!isRussianTextPresent) {
                    console.warn("Русские символы не обнаружены, пробуем UTF-8");
                    const decoderUtf8 = new TextDecoder('utf-8');
                    csvData = decoderUtf8.decode(buffer);
                }

                if (!csvData.trim()) {
                    throw new Error('Файл CSV пуст');
                }

                Papa.parse(csvData, {
                    header: true,
                    skipEmptyLines: true,
                    delimiter: ';',
                    complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
                        if (results.errors.length > 0) {
                            console.error('CSV parsing errors:', results.errors);
                            reject(new Error(`Ошибка парсинга CSV: ${results.errors[0].message}`));
                            return;
                        }

                        const headers = results.meta.fields || [];
                        const isTimeColumn = headers.map(header =>
                            header.toLowerCase().includes('время')
                        );


                        const rows = results.data.map((row: Record<string, unknown>) => {
                            const processedRow: Record<string, unknown> = {};
                            headers.forEach((header, index) => {
                                try {

                                    if (isTimeColumn[index] && row[header]) {
                                        const dateValue = parseDateTime(String(row[header]));
                                        processedRow[header] = !isNaN(dateValue.getTime()) && row[header];

                                    } else {
                                        processedRow[header] = row[header];
                                    }
                                } catch (error) {
                                    console.warn(`Ошибка обработки поля ${header}:`, error);
                                    processedRow[header] = row[header];
                                }
                            });
                            return processedRow;
                        });

                        resolve({headers, rows});
                    },
                    error: (error: Error) => {
                        reject(new Error(`Ошибка парсинга CSV: ${error.message}`));
                    }
                });
            } catch (error) {
                reject(new Error(`Ошибка обработки файла: ${error instanceof Error ? error.message : String(error)}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('Ошибка чтения файла'));
        };

        reader.readAsArrayBuffer(file);
    });
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

    worksheet.eachRow({includeEmpty: false}, (row, rowNumber) => {
        if (rowNumber === 1) return;

        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            const isTimeCol = isTimeColumn[colNumber - 1];

            if (isTimeCol) {
                if (cell.type === ExcelJS.ValueType.Date) {
                    const dateValue = cell.value as Date;
                    rowData[header] = adjustForMoscowTime(dateValue);
                } else if (typeof cell.value === 'number' && cell.value > 10000) {
                    try {
                        const excelDate = new Date((cell.value - 25569) * 86400 * 1000);
                        rowData[header] = adjustForMoscowTime(excelDate);
                    } catch {
                        rowData[header] = cell.value;
                    }
                } else if (typeof cell.value === 'string' && cell.value.match(/\d{4}-\d{2}-\d{2}/)) {
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
                } else {
                    rowData[header] = cell.value;
                }
            } else {
                rowData[header] = cell.value;
            }
        });
        rows.push(rowData);
    });

    return {headers, rows};
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

    applyWorksheetFormatting(worksheet, columns.map(c => c.name));

    await workbook.xlsx.writeBuffer();
};

export const exportToExcel = async (data: ProcessedData, fileName: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Отчёт');
    const isTimeColumn = data.headers.map(header =>
        header.toLowerCase().includes('время')
    );

    worksheet.addRow(data.headers);

    data.rows.forEach(row => {
        const rowData = data.headers.map((header, index) => {
            let value = row[header];
            if (value === null || value === undefined || value === '' ||
                (typeof value === 'string' && value.trim() === '')) {
                value = isNumericColumn(header) ? 0 : '';
            }
            if (isTimeColumn[index] && value instanceof Date) {
                return adjustForMoscowTime(value);
            }
            if (isNumericColumn(header)) {
                const numValue = Number(value);
                return isNaN(numValue) ? 0 : numValue;
            }

            return value;
        });
        console.log("rowData: ", rowData);
        console.log("row: ", row);
        const addedRow = worksheet.addRow(rowData);
        console.log("addedRow: ", addedRow);
        if (row._isSapsan) {
            addedRow._isSapsan = true;
        }
        if (row._isValueError) {
            addedRow._isValueError = true;
        }
    });

    applyWorksheetFormatting(worksheet, data.headers);

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