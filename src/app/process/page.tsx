// src/app/process/page.tsx

'use client'
import React, {useEffect, useMemo, useState} from 'react';
import {ExcelData} from "@/lib/types";
import JSZip from 'jszip';
import {saveAs} from 'file-saver';
import * as ExcelJS from 'exceljs';
import {cn, formatDate, parseDateTime} from "@/utils";
import {FileUp} from "lucide-react";
import {Button} from "@/components/UI/Button";

interface ProcessedRow extends Record<string, string | number | Date | null> {
    _parkPartner: string;
}

interface GroupData {
    headers: string[];
    rows: ProcessedRow[];
    cities: Record<string, number>;
    city?: 'spb' | 'msk';
}

const ProcessPage = () => {
    const [excelData, setExcelData] = useState<ExcelData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const COMMISSION_RATES = {
        SPB: 0.23,
        MSK: 0.27,
        DEFAULT: 0
    } as const;

    const slvProcessTableHeaders = [
        'Номер заказа', 'Время заказа', 'Стоимость', 'Комиссия',
        'Доплата', 'К выплате', 'Адрес', 'Исполнитель', 'Автомобиль', 'Комментарий'
    ];

    const widthColumns = [
        {key: 'Номер заказа', width: 130},
        {key: 'Время заказа', width: 230},
        {key: 'Стоимость', width: 160},
        {key: 'Комиссия 27%', width: 160},
        {key: 'Комиссия 23%', width: 160},
        {key: 'Комиссия', width: 160},
        {key: 'Доплата', width: 160},
        {key: 'К выплате', width: 160},
        {key: 'Адрес', width: 680},
        {key: 'Исполнитель', width: 270},
        {key: 'Автомобиль', width: 270},
        {key: 'Комментарий', width: 680},
    ];

    const numericColumns = ['Номер заказа'];
    const dateColumns = ['Время заказа'];
    const financialColumns = ['Стоимость', 'Комиссия', 'Доплата', 'К выплате'];

    const isFinancialColumns = (header: string) => {
        return financialColumns.some(financialHeader =>
            header.toLowerCase().includes(financialHeader.toLowerCase())
        );
    };

    const isDateColumns = (header: string) => {
        return dateColumns.some(dateHeader =>
            header.toLowerCase().includes(dateHeader.toLowerCase())
        );
    };

    const isNumericColumns = (header: string) => {
        return numericColumns.some(numericHeader =>
            header.toLowerCase().includes(numericHeader.toLowerCase())
        );
    };

    function getColumnLetter(columnIndex: number): string {
        let letter = '';
        while (columnIndex >= 0) {
            letter = String.fromCharCode(65 + (columnIndex % 26)) + letter;
            columnIndex = Math.floor(columnIndex / 26) - 1;
        }
        return letter;
    }

    const getCityForRow = (row: ProcessedRow): 'spb' | 'msk' | null => {
        const address = row['Адрес'] as string;
        return getCityFromAddress(address);
    };

    const applyWorksheetFormatting = (worksheet: ExcelJS.Worksheet, headers: string[]) => {
        headers.forEach((header, index) => {
            const widthConfig = widthColumns.find(w => header.includes(w.key));
            worksheet.getColumn(index + 1).width = widthConfig ? widthConfig.width / 12 : 20;
            if (isFinancialColumns(header)) {
                worksheet.getColumn(index + 1).numFmt = '#,##0.00';
            } else if (isDateColumns(header)) {
                worksheet.getColumn(index + 1).numFmt = 'DD.MM.YYYY HH:mm';
            } else if (isNumericColumns(header)) {
                worksheet.getColumn(index + 1).numFmt = '0';
            }
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Пропускаем заголовок

            const rowData = row.values as Array<string | number | Date | null>;
            const processedRow: Partial<ProcessedRow> = {};
            headers.forEach((header, idx) => {
                processedRow[header] = rowData[idx + 1];
            });

            const city = getCityForRow(processedRow as ProcessedRow);
            const percentCity = city === 'spb'
                ? COMMISSION_RATES.SPB
                : city === 'msk'
                    ? COMMISSION_RATES.MSK
                    : COMMISSION_RATES.DEFAULT;


            const commissionColIndex = headers.findIndex(h => h === 'Комиссия');
            console.log("commissionColIndex: ", commissionColIndex);
            console.log("getColumnLetter(commissionColIndex): ", getColumnLetter(commissionColIndex));

            if (commissionColIndex > 0) {
                const costColLetter = getColumnLetter(headers.findIndex(h => h === 'Стоимость'));
                console.log("costColLetter: ", costColLetter);
                row.getCell(commissionColIndex + 1).value = {
                    formula: `${costColLetter}${rowNumber} * ${percentCity}`
                };
            }


            const payoutColIndex = headers.findIndex(h => h === 'К выплате');
            console.log("payoutColIndex: ", payoutColIndex);
            console.log("getColumnLetter(payoutColIndex): ", getColumnLetter(payoutColIndex));

            if (payoutColIndex > 0) {
                const costColLetter = getColumnLetter(headers.findIndex(h => h === 'Стоимость'));
                console.log("costColLetter_2: ", costColLetter);
                const extraPayColLetter = getColumnLetter(headers.findIndex(h => h === 'Доплата'));
                console.log("extraPayColLetter: ", extraPayColLetter);
                console.log("payoutColIndex_2: ", payoutColIndex);
                row.getCell(payoutColIndex + 1).value = {
                    formula: `(${costColLetter}${rowNumber} - (${costColLetter}${rowNumber} * ${percentCity})) + ${extraPayColLetter}${rowNumber}`
                };
            }
        });


        const lastDataRow = worksheet.rowCount;
        const totalRow = worksheet.addRow(['', '', '', '', '', '']);


        totalRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.border = {
                top: {style: 'thin'},
                left: {style: 'thin'},
                bottom: {style: 'thin'},
                right: {style: 'thin'}
            };
        });


        const payoutColIndex = headers.findIndex(h => h === 'К выплате');
        if (payoutColIndex > 0) {
            const payoutColLetter = getColumnLetter(payoutColIndex);
            totalRow.getCell(payoutColIndex + 1).value = {
                formula: `SUM(${payoutColLetter}2:${payoutColLetter}${lastDataRow})`
            };
        }

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

        worksheet.eachRow((row: ExcelJS.Row, rowNumber) => {
            if (rowNumber === 1) return;

            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber - 1];

                if (cell.value === null || cell.value === undefined || cell.value === '' ||
                    (typeof cell.value === 'string' && cell.value.trim() === '')) {
                    cell.value = isFinancialColumns(header) ? 0 : '';
                }

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

    const getCityFromAddress = (address: string): 'spb' | 'msk' | null => {
        if (!address) return null;
        const addressLower = address.toLowerCase();
        if (addressLower.includes('москва')) return 'msk';
        if (addressLower.includes('санкт-петербург') || addressLower.includes('спб')) return 'spb';
        return null;
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

        const addressColumnKey = data.headers.find(h =>
            h.toLowerCase().includes('адрес'));
        const parkPartnerHeader = data.headers.find(h =>
            h.toLowerCase().includes('парк партнёр')
        );

        const processedRows: ProcessedRow[] = data.rows.map(row => {
            const newRow: Record<string, string | number | Date | null> = {};

            const address = addressColumnKey ? String(row[addressColumnKey] || '') : '';
            const city = getCityFromAddress(address);
            const percentCity = city == 'spb'
                ? COMMISSION_RATES.SPB : city === 'msk'
                    ? COMMISSION_RATES.MSK : COMMISSION_RATES.DEFAULT;


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
            const costPercentCity = parseFloat((cost * percentCity).toFixed(2));

            newRow['Стоимость'] = Number(newRow['Стоимость']);
            newRow['Комиссия'] = costPercentCity;
            newRow['Доплата'] = Number(newRow['Доплата'])
            newRow['К выплате'] = Number((cost - costPercentCity) + extraPayment);
            newRow['Номер заказа'] = Number(newRow['Номер заказа']);

            const parkPartnerValue = parkPartnerHeader ? row[parkPartnerHeader] : null;

            return {
                ...newRow,
                _parkPartner: String(parkPartnerValue).trim() && (String(parkPartnerValue).trim() !== '-')
                    ? String(parkPartnerValue).trim() : 'без парка'
            } as ProcessedRow;
        });

        return {
            headers: slvProcessTableHeaders,
            rows: processedRows
        };
    };
    const processedData = excelData ? processData(excelData) : null;
    console.log("processedData: ", processedData);

    const dateRange = useMemo(() => {
        if (!processedData) return null;

        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        processedData.headers.forEach((header) => {
            if (isTimeColumn(header)) {
                processedData.rows.forEach(row => {
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
    }, [processedData]);

    const getReportPeriodTitle = () => {
        if (!dateRange) return 'Нет информации о периоде';
        return `Отчёт за период ${formatDate(dateRange.minDate)} - ${formatDate(dateRange.maxDate)}`;
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

    const handleExportGeneral = async () => {
        if (!processedData) return;

        setIsProcessing(true);
        try {
            const blob = await createExcelFile(processedData);
            const fileName = dateRange
                ? `отчёт_по_паркам_за_период_${formatDate(dateRange.minDate)}_${formatDate(dateRange.maxDate)}.xlsx`
                : 'общий_отчёт.xlsx';
            saveAs(blob, fileName);
        } catch (error) {
            console.error('Export error:', error);
            alert('Произошла ошибка при экспорте данных');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExport = async () => {
        if (!processedData) return;

        setIsProcessing(true);
        try {
            const groups: Record<string, GroupData> = {};

            processedData.rows.forEach(row => {
                const park = row._parkPartner;
                const address = row['Адрес'] as string;
                const city = getCityFromAddress(address);

                if (!groups[park]) {
                    groups[park] = {
                        headers: [...processedData.headers],
                        rows: [],
                        cities: {}
                    };
                }

                if (city) {
                    groups[park].cities[city] = (groups[park].cities[city] || 0) + 1;
                }

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const {_parkPartner, ...cleanRow} = row;
                groups[park].rows.push(cleanRow as ProcessedRow);
            });

            Object.values(groups).forEach(group => {
                const cities = Object.entries(group.cities);
                const hasMixedCities = cities.length > 1;

                if (!hasMixedCities && cities.length > 0) {
                    const [mainCity] = cities[0];
                    group.city = mainCity as 'spb' | 'msk';
                }

                const commissionIndex = group.headers.findIndex(h => h.includes('Комиссия'));

                if (commissionIndex !== -1) {
                    const newHeader = hasMixedCities
                        ? 'Комиссия'
                        : group.city
                            ? `Комиссия ${group.city === 'spb' ? '23%' : '27%'}`
                            : 'Комиссия';

                    if (group.headers[commissionIndex] !== newHeader) {
                        const oldHeader = group.headers[commissionIndex];

                        group.headers[commissionIndex] = newHeader;
                        group.rows.forEach(row => {
                            if (oldHeader in row) {
                                row[newHeader] = row[oldHeader];
                                delete row[oldHeader];
                            }
                        });
                    }
                }
            });

            const zip = new JSZip();
            const baseName = dateRange
                ? `отчёты_по_паркам_за_период_${formatDate(dateRange.minDate)}_${formatDate(dateRange.maxDate)}`
                : 'отчёты';

            for (const [park, data] of Object.entries(groups)) {
                console.log('park: ', park);
                console.log('park.length: ', park.length);
                const processedPark = park.toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/["'`´‘’“”]/g, '_')
                    .replace(/[\\/*?:[\]]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^[-_]|[-_]$/g, '');

                const fileName = dateRange
                    ? `отчёт_за_период_${formatDate(dateRange.minDate)}_${formatDate(dateRange.maxDate)}_по_${processedPark}`
                    : `отчёт_по_${processedPark}`;

                const safeFileName = fileName.toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/["'`´‘’“”]/g, '_')
                    .replace(/[\\/*?:[\]]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^[-_]|[-_]$/g, '');
                const fileBlob = await createExcelFile(data);
                zip.file(`${safeFileName}.xlsx`, fileBlob);
            }

            const zipBlob = await zip.generateAsync({type: 'blob'});
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
                        onClick={handleExportGeneral}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                    >
            <span className="flex">
                <FileUp className="w-4 mr-1"/>
                {isProcessing ? 'Идет экспорт...' : 'Экспортировать в Excel'}
            </span>
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
            <span className="flex">
                <FileUp className="w-4 mr-1"/>
                {isProcessing ? 'Идет экспорт...' : 'Экспортировать в Excel по паркам'}
            </span>
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <div className="h-full overflow-auto">
                    <table
                        className="min-w-full bg-background border border-border border-collapse border-gray-300 dark:border-gray-600">
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
                                            {
                                                isFinancialColumns(header) ?
                                                    (Number(row[header]) || 0).toFixed(2) :
                                                    String(row[header] || '')
                                            }
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