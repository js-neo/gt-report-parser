// src/app/process/page.tsx

'use client'
import React, {useEffect, useMemo, useState} from 'react';
import { ExcelData } from "@/lib/types";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as ExcelJS from 'exceljs';
import {cn, formatDate, parseDateTime} from "@/utils";
import {FileUp} from "lucide-react";
import {Button} from "@/components/UI/Button";

interface ProcessedRow extends Record<string, string | number | Date | null> {
    _parkPartner: string;
}

const ProcessPage = () => {
    const [excelData, setExcelData] = useState<ExcelData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const slvProcessTableHeaders = [
        'Номер заказа', 'Время заказа', 'Стоимость', 'Комиссия 27%',
        'Доплата', 'К выплате', 'Адрес', 'Исполнитель', 'Автомобиль', 'Комментарий'
    ];

    const widthColumns = [
        { key: 'Номер заказа', width: 130 },
        { key: 'Время заказа', width: 230 },
        { key: 'Стоимость', width: 160 },
        { key: 'Комиссия 27%', width: 160 },
        { key: 'Доплата', width: 160 },
        { key: 'К выплате', width: 160 },
        { key: 'Адрес', width: 680 },
        { key: 'Исполнитель', width: 270 },
        { key: 'Автомобиль', width: 270 },
        { key: 'Комментарий', width: 680 },
    ];

    const numericColumns = ['Стоимость', 'Комиссия 27%', 'Доплата', 'К выплате'];

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
            }
        });

        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {argb: 'FFE6FFE6'}
            };
            cell.font = {
                bold: true,
                size: 12,
                name: 'Arial'
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

        worksheet.eachRow((row: ExcelJS.Row, rowNumber) => {
            if (rowNumber === 1) return;
            const isEvenRow = rowNumber % 2 === 0;
            const rowFillColor = isEvenRow ? 'FFF2F2F2' : 'FFFFFFFF';

            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber - 1];

                if (cell.value === null || cell.value === undefined || cell.value === '' ||
                    (typeof cell.value === 'string' && cell.value.trim() === '')) {
                    cell.value = isNumericColumn(header) ? 0 : '-';
                }

                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {argb: rowFillColor}
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

    useEffect(() => {
        const savedProcessData = sessionStorage.getItem('processedData');
        if (savedProcessData) {
            const parsedData = JSON.parse(savedProcessData);
            setExcelData(parsedData);
            sessionStorage.setItem('savedProcessData', JSON.stringify(savedProcessData));
        }
    }, []);

    console.log("ExcelData:", excelData);

    const isTimeColumn = (header: string) => {
        return header.toLowerCase().includes('время');
    };

    const dateRange = useMemo(() => {
        if (!excelData) return null;

        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        excelData.headers.forEach((header) => {
            if (isTimeColumn(header)) {
                excelData.rows.forEach(row => {
                    const value = row[header];
                    if (!value) return;

                    const date = parseDateTime(value);
                    if (isNaN(date.getTime())) return;

                    if (!minDate || date < minDate) minDate = date;
                    if (!maxDate || date > maxDate) maxDate = date;
                });
            }
        });

        return minDate && maxDate ? {minDate, maxDate} : null;
    }, [excelData]);

    const getReportPeriodTitle = () => {
        if (!dateRange) return 'Нет информации о периоде';
        return `Отчёт за период ${formatDate(dateRange.minDate)} - ${formatDate(dateRange.maxDate)}`;
    };

    const processData = (data: ExcelData): { headers: string[]; rows: ProcessedRow[] } => {
        const headerMap: Record<string, string> = {};

        slvProcessTableHeaders.forEach(targetHeader => {
            if (targetHeader === 'Комиссия 27%' || targetHeader === 'К выплате') return;

            const sourceHeader = data.headers.find(header =>
                header.toLowerCase().includes(targetHeader.toLowerCase())
            );

            if (sourceHeader) {
                headerMap[targetHeader] = sourceHeader;
            }
        });

        const parkPartnerHeader = data.headers.find(h =>
            h.toLowerCase().includes('парк партнёр')
        );

        const processedRows: ProcessedRow[] = data.rows.map(row => {
            const newRow: Record<string, string | number | Date | null> = {};

            Object.entries(headerMap).forEach(([targetHeader, sourceHeader]) => {
                const value = row[sourceHeader];

                if (value === null || value === undefined) {
                    newRow[targetHeader] = null;
                } else if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
                    newRow[targetHeader] = value;
                } else {
                    newRow[targetHeader] = String(value);
                }
            });

            const cost = Number(newRow['Стоимость']) || 0;
            const extraPayment = Number(newRow['Доплата']) || 0;

            newRow['Комиссия 27%'] = cost * 0.27;
            newRow['К выплате'] = (cost - (cost * 0.27)) + extraPayment;

            const parkPartnerValue = parkPartnerHeader ? row[parkPartnerHeader] : null;

            return {
                ...newRow,
                _parkPartner: parkPartnerValue ? String(parkPartnerValue) : 'без парка'
            } as ProcessedRow;
        });

        return {
            headers: slvProcessTableHeaders,
            rows: processedRows
        };
    };
if (excelData) {
    console.log("processData(): ", processData(excelData));
}


    const getDateRange = (data: ExcelData) => {
        const timeHeader = data.headers.find(h =>
            h.toLowerCase().includes('время заказа')
        );

        if (!timeHeader) return null;

        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        data.rows.forEach(row => {
            const dateValue = row[timeHeader];
            if (dateValue === null || dateValue === undefined) return;

            try {
                let date: Date;
                if (dateValue instanceof Date) {
                    date = dateValue;
                } else if (typeof dateValue === 'string') {
                    date = new Date(dateValue);
                } else if (typeof dateValue === 'number') {
                    date = new Date(dateValue);
                } else {
                    return;
                }

                if (isNaN(date.getTime())) return;

                if (!minDate || date < minDate) minDate = date;
                if (!maxDate || date > maxDate) maxDate = date;
            } catch (error) {
                console.warn('Invalid date format', dateValue);
                console.log('Error: ', error);
            }
        });

        return minDate && maxDate ? { minDate, maxDate } : null;
    };

    const formatDateForFilename = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const createExcelFile = async (data: { headers: string[]; rows: ProcessedRow[] }): Promise<Blob> => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Отчёт');

        worksheet.addRow(data.headers);

        data.rows.forEach(row => {
            const rowData = data.headers.map(header => {
                const value = row[header];
                return value === null || value === undefined ? '' : value;
            });
            worksheet.addRow(rowData);
        });

        applyWorksheetFormatting(worksheet, data.headers);

        const buffer = await workbook.xlsx.writeBuffer();
        return new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
    };

    const handleExport = async () => {
        if (!excelData) return;

        setIsProcessing(true);
        try {
            const processedData = processData(excelData);
            const dateRange = getDateRange(excelData) || getDateRange(processedData);

            const groups: Record<string, { headers: string[]; rows: ProcessedRow[] }> = {};

            processedData.rows.forEach(row => {
                const park = row._parkPartner;

                if (!groups[park]) {
                    groups[park] = {
                        headers: processedData.headers,
                        rows: []
                    };
                }

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { _parkPartner, ...cleanRow } = row;
                groups[park].rows.push(cleanRow as ProcessedRow);
            });

            const zip = new JSZip();
            const baseName = dateRange
                ? `отчёты_по_паркам_за_период_${formatDateForFilename(dateRange.minDate)}_${formatDateForFilename(dateRange.maxDate)}`
                : 'отчёты';

            for (const [park, data] of Object.entries(groups)) {
                const fileName = dateRange
                    ? `отчёт_за_период_${formatDateForFilename(dateRange.minDate)}_${formatDateForFilename(dateRange.maxDate)}_по_${park}`
                    : `отчёт_по_${park}`;

                const safeFileName = fileName.replace(/[\\/*?:[\]]/g, '_');
                const fileBlob = await createExcelFile(data);
                zip.file(`${safeFileName}.xlsx`, fileBlob);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `${baseName}.zip`);

        } catch (error) {
            console.error('Export error:', error);
            alert('Произошла ошибка при экспорте данных');
        } finally {
            setIsProcessing(false);
        }
    };

    console.log("excelData: ", excelData);

    if (!excelData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Обработка данных</h1>
                <p>Загрузка данных...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 flex flex-col h-[calc(100vh-1rem)]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Обработка данных</h1>
                    <h2 className="font-light">{getReportPeriodTitle()}</h2>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleExport}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                        <span className="flex"><FileUp className="w-4 mr-1"/>{isProcessing ? 'Идет экспорт...' : 'Экспортировать в Excel по паркам'}</span>
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <div className="h-full overflow-auto">
                    <table className="min-w-full bg-background border border-border border-collapse border-gray-300 dark:border-gray-600">
                        <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            {slvProcessTableHeaders.map((header, index) => {
                                const isWide = header.toLowerCase().includes('адрес') ||
                                    header.toLowerCase().includes('комментарий');
                                return (
                                    <th
                                        key={index}
                                        className={cn(
                                            "px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                            "tracking-wider border border-border border-gray-300 dark:border-gray-600",
                                            "transition-colors",
                                            isWide ? "max-w-[400px] min-w-[400px]" : "max-w-[220px] min-w-[80px]"
                                        )}
                                    >
                                        <div className="flex items-center justify-center">
                                            {header}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {excelData && processData(excelData).rows.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-gray-50 dark:bg-gray-700'}
                            >
                                {slvProcessTableHeaders.map((header, colIndex) => {
                                    const isWide = header.toLowerCase().includes('адрес') ||
                                        header.toLowerCase().includes('комментарий');
                                    return (
                                        <td
                                            key={colIndex}
                                            className={cn(
                                                "px-1 py-2 text-sm text-center text-foreground border border-border",
                                                "border-gray-300 dark:border-gray-600",
                                                isWide ? "max-w-[400px] min-w-[400px] break-words whitespace-normal" :
                                                    "max-w-[150px] min-w-[80px] break-words whitespace-normal"
                                            )}
                                        >
                                            {header === 'Комиссия 27%' ?
                                                (row['Комиссия 27%'] as number).toFixed(2) :
                                                header === 'К выплате' ?
                                                    (row['К выплате'] as number).toFixed(2) :
                                                    String(row[header] || '')}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>


            {isProcessing && (
                <div className="mt-4 text-sm text-gray-600">
                    <p>Формирование архива с отчетами...</p>
                    <p>Это может занять некоторое время в зависимости от объема данных</p>
                </div>
            )}
        </div>
    );
};

export default ProcessPage;