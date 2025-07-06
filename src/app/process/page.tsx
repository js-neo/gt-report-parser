// src/app/process/page.tsx

'use client'
import React, {useEffect, useMemo, useState} from 'react';
import {ExcelData} from "@/lib/types";
import JSZip from 'jszip';
import {saveAs} from 'file-saver';
import * as ExcelJS from 'exceljs';
import {cn, formatDate, formatDateTime, parseDateTime} from "@/utils";
import {FileUp} from "lucide-react";
import {Button} from "@/components/UI/Button";

interface ProcessedRow extends Record<string, string | number | boolean | null> {
    _parkPartner: string;
    _isSapsan: boolean;
    _isValueError: boolean;
}

interface GroupData {
    headers: string[];
    rows: ProcessedRow[];
    cities: Record<string, number>;
    city?: 'spb' | 'msk';
}

interface FontStyle {
    charset?: number;
    color?: { argb: string };
    family?: number;
    name?: string;
    scheme?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

interface RichTextItem {
    text?: string;
    font?: FontStyle
}

interface RichTextObject {
    richText?: RichTextItem[];
}

type CellValue =
    | string
    | number
    | Date
    | boolean
    | RichTextObject
    | null
    | undefined;

const ProcessPage = () => {
    const [excelData, setExcelData] = useState<ExcelData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const COMMISSION_RATES = {
        SPB: 0.23,
        MSK: 0.27,
        DEFAULT: 0
    } as const;

    const minRateSPB = {
        base: 2250
    };

    const minRateMSK = {
        base: 3200,
        domodedovo: 4100,
        gukovskiy: 4500,
        port_port: 6000
    };

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
    const commentColumns = ['Комментарий'];

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

    const isCommenticColumns = (header: string) => {
        return commentColumns.some(commentColumns =>
            header.toLowerCase().includes(commentColumns.toLowerCase())
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

            const isSapsan = row._isSapsan === true;
            const isValueError = row._isValueError === true;
            const rowFillColor = isValueError ?
                'FFFFCCCC' : isSapsan ?
                    'FFE6FFE6' : 'FFFFFFFF';

            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber - 1];

                if (cell.value === null || cell.value === undefined || cell.value === '' ||
                    (typeof cell.value === 'string' && cell.value.trim() === '')) {
                    cell.value = isFinancialColumns(header) ? 0 : '';
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

            const rowData = row.values as Array<string | number | null>;
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


            const {cost, commission, extraPay, payout} = headers.reduce((acc, header, index) => {
                if (header === 'Стоимость') acc.cost = index;
                else if (header.startsWith('Комиссия')) acc.commission = index;
                else if (header === 'Доплата') acc.extraPay = index;
                else if (header === 'К выплате') acc.payout = index;
                return acc;
            }, {cost: -1, commission: -1, extraPay: -1, payout: -1});

            if (commission >= 0 && cost >= 0) {
                row.getCell(commission + 1).value = {
                    formula: `${getColumnLetter(cost)}${rowNumber} * ${percentCity}`
                };
            } else if (commission >= 0) {
                console.error('Для расчета комиссии не найдена колонка "Стоимость"');
            }

            if (payout >= 0) {
                if (cost >= 0 && commission >= 0 && extraPay >= 0) {
                    row.getCell(payout + 1).value = {
                        formula: `(${getColumnLetter(cost)}${rowNumber}-${getColumnLetter(commission)}${rowNumber})+${getColumnLetter(extraPay)}${rowNumber}`
                    };
                } else {
                    const missing = [
                        cost < 0 && 'Стоимость',
                        commission < 0 && 'Комиссия',
                        extraPay < 0 && 'Доплата'
                    ].filter(Boolean).join(', ');
                    console.error(`Отсутствуют колонки: ${missing}`);
                }
            } else {
                console.error('Колонка "К выплате" не найдена');
            }
        });

        const lastDataRow = worksheet.rowCount;
        const totalRow = worksheet.addRow(['', '', '', '', '', '']);

        totalRow.eachCell({includeEmpty: false}, (cell) => {
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
        });


        const payoutIndex = headers.findIndex(h => h === 'К выплате');
        if (payoutIndex >= 0) {
            totalRow.getCell(payoutIndex + 1).value = {
                formula: `SUM(${getColumnLetter(payoutIndex)}2:${getColumnLetter(payoutIndex)}${lastDataRow})`
            };
        } else {
            console.error('Колонка "К выплате" не найдена для итоговой строки');
        }
    };


    useEffect(() => {
        const savedProcessData = sessionStorage.getItem('processedData');
        if (savedProcessData) {
            const parsedData = JSON.parse(savedProcessData);
            setExcelData(parsedData);
            sessionStorage.setItem('savedProcessData', JSON.stringify(savedProcessData));
        }
    }, []);

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

    const handleString = (str: string) => {
        const [, aPart, bPart] = str.split(/A\)|B\)/);
        const pointA = aPart?.trim().replace(/;$/, '') ?? '';
        const pointB = bPart?.trim().replace(/;$/, '') ?? '';
        return {pointA, pointB};
    };

    const getMoscowMinRate = (address: string) => {
        const {pointA, pointB} = handleString(address);
        const pointALower = pointA.toLowerCase();
        const pointBLower = pointB.toLowerCase();

        if (pointALower.includes('аэропорт') && pointBLower.includes('аэропорт')) {
            return minRateMSK.port_port;
        }
        if (pointALower.includes('домодедово') || pointBLower.includes('домодедово')) {
            return minRateMSK.domodedovo;
        }
        if (pointALower.includes('жуковский') || pointBLower.includes('жуковский')) {
            return minRateMSK.gukovskiy;
        }
        return minRateMSK.base;
    };

    const findTollPayments = (comment: string) => {
        if (!comment) return [];

        const tollRoadPatterns = [
            {
                regex: /(платные? дороги?|платка|зсд)\D*(\d+)\s*вкл/gi,
                processMatch: (match: RegExpExecArray) => parseInt(match[2], 10)
            },
            {
                regex: /зсд\/\+\s*(\d+)\s*зсд\s*вкл/gi,
                processMatch: (match: RegExpExecArray) => parseInt(match[1], 10)
            }
        ];

        const parkingPatterns = [
            {
                regex: /(платные? парковки?|парковка)\D*(\d+)\s*вкл/gi,
                processMatch: (match: RegExpExecArray) => parseInt(match[2], 10)
            }
        ];

        const payments: { type: string; amount: number, match: string }[] = [];

        tollRoadPatterns.some(pattern => {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            const match = regex.exec(comment);
            if (match) {
                const amount = pattern.processMatch(match);
                if (!isNaN(amount)) {
                  //  console.log(`[toll_road] Найдено: "${match[0]}" (сумма: ${amount})`);
                    payments.push({
                        type: 'toll_road',
                        amount,
                        match: match[0]
                    });
                    return true;
                }
            }
            return false;
        });

        parkingPatterns.some(pattern => {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            const match = regex.exec(comment);
            if (match) {
                const amount = pattern.processMatch(match);
                if (!isNaN(amount)) {
                   // console.log(`[parking] Найдено: "${match[0]}" (сумма: ${amount})`);
                    payments.push({
                        type: 'parking',
                        amount,
                        match: match[0]
                    });
                    return true;
                }
            }
            return false;
        });

        if (payments.length > 0) {
            // console.log('Итоговые платежи:', payments);
        }

        return payments;
    };

    function isRichTextObject(value: unknown): value is RichTextObject {
        return typeof value === 'object' &&
            value !== null &&
            'richText' in value &&
            Array.isArray((value as RichTextObject).richText);
    }

    function getTextStyle(font?: RichTextItem['font']): React.CSSProperties {
        if (!font) return {};

        const style: React.CSSProperties = {};

        if (font.color?.argb) {
            style.color = `#${font.color.argb.slice(2)}${font.color.argb.slice(0, 2)}`;
        }
        if (font.bold) style.fontWeight = 'bold';
        if (font.italic) style.fontStyle = 'italic';
        if (font.size) style.fontSize = `${font.size}pt`;

        return style;
    }


    interface RichTextDisplayProp {
        value: CellValue;
    }
    const RichTextDisplay: React.FC<RichTextDisplayProp> = ({ value }) => {
        if (value === null || value === undefined) return null;

        if (isRichTextObject(value)) {
            const richText = value.richText?.filter((item) => item.text?.trim()) || [];
            return (
                <div className='whitespace-pre-line'>
                    {richText.map((item, index) => {
                        return (
                            <p key={index}
                               className='mb-1 last:mb-0'
                               style={getTextStyle(item.font)}>
                            {item.text}
                        </p>)
                    })}
                </div>
            );
        }

        return <div>{String(value)}</div>;
    };

    const processData = (data: ExcelData): { headers: string[]; rows: ProcessedRow[] } => {
        const headerMap: Record<string, string> = {};

        slvProcessTableHeaders.forEach(targetHeader => {
            if (targetHeader === 'Комиссия' || targetHeader === 'К выплате') return;

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
        const commentColumnKey = data.headers.find(h =>
            h.toLowerCase().includes('комментарий'));
        const costColumnKey = data.headers.find(h =>
            h.toLowerCase().includes('стоимость'));

        const processedRows: ProcessedRow[] = data.rows.map(row => {
            const newRow: Record<string, CellValue> = {};
            if (!("_isSapsan" in row)) {
                newRow._isSapsan = false;
                if (commentColumnKey) {
                    const comment = String(row[commentColumnKey] || '').toLowerCase();

                    if (comment.includes('сапсан наличные')) {
                        newRow._isSapsan = true;
                    }
                }
            }

            if (!("_isValueError" in row)) {
                newRow._isValueError = false;
                if (commentColumnKey && addressColumnKey && costColumnKey && !newRow._isSapsan) {
                    const comment = String(row[commentColumnKey] || '');
                    const address = String(row[addressColumnKey] || '');
                    const currentCost = Number(row[costColumnKey]) || 0;

                    const payments = findTollPayments(comment);
                    if (payments.length > 0) {
                        const city = getCityFromAddress(address);
                        const minRate = city === 'spb' ? minRateSPB.base : getMoscowMinRate(address);
                        if (!city) {
                            newRow._isValueError = true;
                        } else if (currentCost < minRate) {
                            newRow._isValueError = true;
                        }

                    } else if (
                        /(платные? дороги?|платка|зсд|платные? парковки?|парковка)/i.test(comment) &&
                        !/вкл/i.test(comment)
                    ) {
                        newRow._isValueError = true;
                    }
                }
            }

            const address = addressColumnKey ? String(row[addressColumnKey] || '') : '';
            const city = getCityFromAddress(address);
            const percentCity = city == 'spb'
                ? COMMISSION_RATES.SPB : city === 'msk'
                    ? COMMISSION_RATES.MSK : COMMISSION_RATES.DEFAULT;


            Object.entries(headerMap).forEach(([targetHeader, sourceHeader]) => {
                const value = row[sourceHeader];

                if (value === null || value === undefined) {
                    newRow[targetHeader] = null;
                } else if (value instanceof Date) {
                    newRow[targetHeader] = formatDateTime(value);
                } else if (typeof value === 'string' || typeof value === 'number') {
                    newRow[targetHeader] = value;
                } else if (isRichTextObject(value)) {
                    newRow[targetHeader] = value;
                } else {
                    console.log("typeof value: ", typeof value);
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
            const addedRow = worksheet.addRow(rowData);
            if (row._isSapsan) {
                addedRow._isSapsan = true;
            }
            if (row._isValueError) {
                addedRow._isValueError = true;
            }
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

    if (!excelData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Обработка данных</h1>
                <p>Загрузка данных...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 flex flex-col h-[calc(100vh-1rem)] dark:bg-gray-900">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Обработка данных</h1>
                    <h2 className="font-light">{getReportPeriodTitle()}</h2>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleExportGeneral}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-800 text-white"
                    >
            <span className="flex">
                <FileUp className="w-4 mr-1"/>
                {isProcessing ? 'Идет экспорт...' : 'Экспортировать в Excel'}
            </span>
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-800 dark:hover:bg-green-900 text-white"
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
                        className="min-w-full bg-background border border-border border-collapse border-gray-300 dark:border-gray-600 dark:bg-gray-800">
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
                                className={cn(row._isSapsan && 'bg-green-100 dark:bg-green-900',
                                    row._isValueError && 'bg-red-100 dark:bg-red-900')}
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
                                                isWide ? "max-w-[400px] min-w-[400px]" : "max-w-[150px] min-w-[80px]",
                                                isCommenticColumns(header) ? "text-left whitespace-pre-line" : "break-words whitespace-normal"
                                            )}
                                        >
                                            {
                                                isFinancialColumns(header) ?
                                                    (Number(row[header]) || 0).toFixed(2) :
                                                        isCommenticColumns(header) ?
                                                            <RichTextDisplay value={row[header]}/> :
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