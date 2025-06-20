// src/app/page.tsx

"use client"

import {useState, useCallback, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Check, X} from 'lucide-react';
import {FileUpload} from '@/components/FileUpload';
import {ColumnEditor} from '@/components/ColumnEditor';
import {Button} from '@/components/UI/Button';
import type {ExcelData, ColumnConfig, RowWithSapsanFlag} from '@/lib/types';
import {ProgressBar} from "@/components/UI/ProgressBar";
import {formatDateTime} from "@/utils";
import {processExcelData} from "@/lib/excelParser";
import {Toggle} from '@/components/UI/Toggle';
import {Label} from '@/components/UI/Label';

export default function Home() {
    const [excelData, setExcelData] = useState<ExcelData | null>(null);
    const [partnerDataSPB, setPartnerDataSPB] = useState<ExcelData | null>(null);
    const [excelDataMoscow, setExcelDataMoscow] = useState<ExcelData | null>(null);
    const [partnerDataMoscow, setPartnerDataMoscow] = useState<ExcelData | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isSLVMode, setIsSLVMode] = useState(true);
    const router = useRouter();

    const slvTableHeaders = ['Номер заказа', 'Время заказа', 'Текущий статус', 'Стоимость', 'Сумма клиента',
        'Организация', 'Адрес', 'Исполнитель', 'Автомобиль', 'Комментарий', 'Клиент', 'Парк партнёр', 'Доплата'];

    useEffect(() => {
        const savedPreviewData = sessionStorage.getItem('savedPreviewData');
        if (savedPreviewData) {
            const parsedData = JSON.parse(savedPreviewData);
            setExcelData({
                headers: parsedData.headers,
                rows: parsedData.rows
            });
            setColumns(parsedData.headers.map((header: string) => ({
                id: header,
                name: header,
                visible: true
            })));
            sessionStorage.removeItem('savedPreviewData');
        }
    }, []);

    const checkCityAddress = (data: ExcelData, city: string): boolean => {
        const addressColumn = data.headers.find(header =>
            header.toLowerCase().includes('адрес'));
        if (!addressColumn) return false;
        return data.rows.some(row =>
            String(row[addressColumn]).toLowerCase().includes(city.toLowerCase()));
    };

    const handleFileUpload = useCallback((data: ExcelData, fileType: 'spb' | 'moscow') => {
        const city = fileType === 'spb' ? 'санкт-петербург' : 'москва';
        if (!checkCityAddress(data, city)) {
            alert(`В файле не найдены адреса с указанием города ${city}`);
            return;
        }

        if (fileType === 'spb') {
            setExcelData(data);
        } else {
            setExcelDataMoscow(data);
        }

        if (isSLVMode) {
            const slvColumns: ColumnConfig[] = slvTableHeaders.map(header => {
                const existingHeader = data.headers.find(h =>
                    h.toLowerCase().includes(header.toLowerCase())
                );

                return {
                    id: existingHeader || header,
                    name: header === 'Организация' ? 'Заказчик' : header,
                    visible: true
                };
            });

            setColumns(slvColumns);
        } else {
            setColumns(data.headers.map(header => ({
                id: header,
                name: header,
                visible: true
            })));
        }
    }, [isSLVMode]);

    const handlePartnerFileUpload = useCallback((data: ExcelData, city: 'spb' | 'moscow') => {
        const requiredCity = city === 'spb' ? 'санкт-петербург' : 'москва';
        if (!checkCityAddress(data, requiredCity)) {
            alert(`В файле партнёра не найдены адреса с указанием города ${requiredCity}`);
            return;
        }
        const hasPartnerColumn = data.headers.find(header =>
            header.toLowerCase().includes('партнер'));

        if (!hasPartnerColumn) {
            alert('В файле партнёра отсутствует колонка "Партнер"');
        }

        if (city === 'spb') {
            setPartnerDataSPB(data);
        } else {
            setPartnerDataMoscow(data);
        }

    }, []);

    const removePhoneNumber = (text: string): string => {
        const countryCodeRegex = /(\+7|7|8)\d{10}|(\+7|7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g;
        const localPhoneRegex = /9\d{9}|\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g;

        let result = text;
        let hasCountryCodeNumbers = false;

        let match;
        while ((match = countryCodeRegex.exec(text)) !== null) {
            console.log(`[Номер с кодом] Найдено: "${match[0]}" (позиция ${match.index})`);
            result = result.replace(match[0], '');
            hasCountryCodeNumbers = true;
        }

        if (!hasCountryCodeNumbers) {
            while ((match = localPhoneRegex.exec(text)) !== null) {
                console.log(`[Локальный номер] Найдено: "${match[0]}" (позиция ${match.index})`);
                result = result.replace(match[0], '');
            }
        }

        return result.replace(/\s+/g, ' ').trim();
    };

    const processAndSaveData = (columns: ColumnConfig[], data: ExcelData) => {

        const columnMapping = columns.reduce((acc, column) => {
            if (column.visible) {
                acc[column.id] = column.name;
            }
            return acc;
        }, {} as Record<string, string>);

        let rows = [...data.rows];
        const timeColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('время заказа')
        );

        if (timeColumnKey) {
            rows.sort((a, b) => {
                const getDateValue = (value: unknown): Date => {
                    if (value instanceof Date) return value;
                    if (typeof value === 'string') {
                        const parsedDate = new Date(value);
                        return isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
                    }
                    return new Date(0);
                };

                const dateA = getDateValue(a[timeColumnKey]);
                const dateB = getDateValue(b[timeColumnKey]);

                return dateA.getTime() - dateB.getTime();
            });
        }

        const commentColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('комментарий'));

        const executorColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('исполнитель'));

        const customerColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('заказчик'));

        const clientColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().trim() === 'клиент');

        rows = rows.map(row => {
            if (clientColumnKey) {
                row[clientColumnKey] = '';
            }

            if (commentColumnKey && row[commentColumnKey]) {
                row[commentColumnKey] = removePhoneNumber(String(row[commentColumnKey]));
            }

            if (!commentColumnKey || !executorColumnKey || !customerColumnKey) return row;
            const comment = String(row[commentColumnKey] || '').toLowerCase();
            const executor = String(row[executorColumnKey] || '').trim();

            if (comment.includes('сапсан наличные')) {
                return {
                    ...row,
                    [customerColumnKey]: 'Сапсан',
                    _isSapsan: true
                }
            }

            if (executor) return row;

            if (comment.includes('асонов')) {
                return {
                    ...row,
                    [executorColumnKey]: 'Асонов'
                }
            }

            const yandexPatterns = [
                /я$/i,
                /як$/i,
                /яким$/i,
                /яков$/i,
                /\dя$/i,
                /\dяк$/i,
                /\dяким$/i,
                /\dяков$/i,
                /я\d{3}$/i,
                /\dя\d{3}$/i,
                /\/я$/i,
                /\/як$/i,
                /\/яким$/i,
                /\/яков$/i,
                /\/яков/i,
                /\/яким/i,
                /\sя$/i,
                /\sяк$/i,
                /\sяким$/i,
                /\sяков$/i,
                /я[^а-яё]*$/i,
                /як[^а-яё]*$/i,
                /яким[^а-яё]*$/i
            ];

            const isYandex = (comment: unknown) => {
                const commentText = String(comment || '').toLowerCase();
                const exceptionRegs = [/ния$/i, /парадная\s*\d*$/i];
                const isException = exceptionRegs.some(reg => reg.test(commentText));
                if (isException) return false;
                return yandexPatterns.some(pattern => {
                    const matched = pattern.test(commentText);
                    if (matched) console.log(`Matched pattern: ${pattern} for text: ${commentText}`);
                    return matched;
                });
            };

            if (isYandex(row[commentColumnKey])) {
                return {
                    ...row,
                    [executorColumnKey]: 'Яндекс'
                }
            }

            const viliPatterns = [
                /влад\d{3}$/i,
                /\/в$/i,
                /в$/i,
                /\/в\s*$/i,
                /\dв\d{3}$/i,
                /\d\/в/i,
                /\dв$/i,
            ];

            const isVili = (comment: unknown) => {
                const commentText = String(comment || '');
                const exceptionRegs = [/ов$/];
                const isException = exceptionRegs.some(reg => reg.test(commentText));
                if (isException) {
                    console.log('Не добавлено по исключению:', commentText);
                    return false;
                }
                return viliPatterns.some(pattern => {
                    const matched = pattern.test(commentText);
                    if (matched) console.log(`Matched Vili pattern: ${pattern} for text: ${commentText}`);
                    return matched;
                });
            };

            if (isVili(row[commentColumnKey])) {
                return {
                    ...row,
                    [executorColumnKey]: 'Вили'
                }
            }

            return {
                ...row,
                _isSapsan: false
            };

        })

        if (isSLVMode && (partnerDataSPB || partnerDataMoscow)) {
            const partnerMapping: Record<string, string> = {};

            if (partnerDataSPB) {
                partnerDataSPB.rows.forEach(row => {
                    const orderNumber = row['Номер заказа'];
                    const partner = row['Партнер'];
                    if (orderNumber && partner) {
                        partnerMapping[String(orderNumber)] = String(partner);
                    }
                });
            }

            if (partnerDataMoscow) {
                partnerDataMoscow.rows.forEach(row => {
                    const orderNumber = row['Номер заказа'];
                    const partner = row['Партнер'];
                    if (orderNumber && partner) {
                        partnerMapping[String(orderNumber)] = String(partner);
                    }
                });
            }


            rows = rows.map(row => {
                const orderNumber = row['Номер заказа'];
                const partner = orderNumber ? partnerMapping[String(orderNumber)] : undefined;

                return {
                    ...row,
                    'Парк партнёр': partner || '',
                    'Доплата': row['Доплата'] || ''
                };
            });
        }

        const processedData = {
            headers: Object.values(columnMapping),
            rows: rows.map(row => {
                const processedRow: RowWithSapsanFlag = {};
                const typedRow = row as RowWithSapsanFlag
                for (const [originalId, newName] of Object.entries(columnMapping)) {
                    if (row[originalId] instanceof Date) {
                        processedRow[newName] = formatDateTime(row[originalId] as Date);
                    } else {
                        processedRow[newName] = row[originalId];
                    }
                }
                processedRow._isSapsan = typedRow._isSapsan;
                return processedRow;
            }),
            initialSort: timeColumnKey ? {
                key: columnMapping[timeColumnKey],
                direction: 'asc' as const
            } : null
        };

        sessionStorage.setItem('processedData', JSON.stringify(processedData));
        return processedData;
    };

    const handleProcess = async () => {
        if (!excelData) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    return prev + 10;
                });
            }, 300);

            await processExcelData(excelData, columns);

            processAndSaveData(columns, excelData);

            clearInterval(interval);
            setProgress(100);
            router.push('/preview');
        } catch (error) {
            console.error('Processing error:', error);
            setIsProcessing(false);
        }
    };

    const handlePreview = () => {
        if (!excelData) return;
        processAndSaveData(columns, excelData);
        router.push('/preview');
    };

    const allFilesUploaded = () => {
        if (!isSLVMode) return !!excelData;
        return !!excelData && !!partnerDataSPB && !!excelDataMoscow && !!partnerDataMoscow;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">GT-Report Parser</h1>

            {!excelData ? (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Toggle
                            id="slv-mode"
                            pressed={isSLVMode}
                            onPressedChange={setIsSLVMode}
                            withIcon={true}
                            iconOn={<Check className="w-4 h-4 text-blue-500"/>}
                            iconOff={<X className="w-4 h-4 text-gray-500"/>}
                        />
                        <Label htmlFor="slv-mode">Режим СЛВ</Label>
                    </div>
                    {isSLVMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border p-4 rounded-lg">
                                <h3 className="text-lg font-medium mb-2">Основной файл Санкт-Петербург</h3>
                                <FileUpload
                                    onUploadAction={(data) => handleFileUpload(data, 'spb')}
                                />
                            </div>
                            <div className="border p-4 rounded-lg">
                                <h3 className="text-lg font-medium mb-2">Файл партнёра Санкт-Петербург</h3>
                                <FileUpload
                                    onUploadAction={(data) => handlePartnerFileUpload(data, 'spb')}
                                    acceptOnly={['Номер заказа', 'Партнер']}
                                />
                            </div>
                            <div className="border p-4 rounded-lg">
                                <h3 className="text-lg font-medium mb-2">Основной файл Москва</h3>
                                <FileUpload
                                    onUploadAction={(data) => handleFileUpload(data, 'moscow')}
                                />
                            </div>
                            <div className="border p-4 rounded-lg">
                                <h3 className="text-lg font-medium mb-2">Файл партнёра Москва</h3>
                                <FileUpload
                                    onUploadAction={(data) => handlePartnerFileUpload(data, 'moscow')}
                                    acceptOnly={['Номер заказа', 'Партнер']}
                                />
                            </div>
                        </div>
                    ) : (
                        <FileUpload onUploadAction={(data) => handleFileUpload(data, 'spb')}/>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {isSLVMode && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="border p-3 rounded-lg">
                                <p className="text-sm font-medium">СПБ основной: {excelData ? "✅" : "❌"}</p>
                            </div>
                            <div className="border p-3 rounded-lg">
                                <p className="text-sm font-medium">СПБ партнёр: {partnerDataSPB ? "✅" : "❌"}</p>
                            </div>
                            <div className="border p-3 rounded-lg">
                                <p className="text-sm font-medium">Москва основной: {excelDataMoscow ? "✅" : "❌"}</p>
                            </div>
                            <div className="border p-3 rounded-lg">
                                <p className="text-sm font-medium">Москва партнёр: {partnerDataMoscow ? "✅" : "❌"}</p>
                            </div>
                        </div>
                    )}

                    <ColumnEditor
                        columns={columns}
                        onChange={setColumns}
                    />

                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={handlePreview}
                            disabled={!allFilesUploaded()}
                            tooltip={!allFilesUploaded() ? "Загрузите все необходимые файлы" : undefined}
                        >
                            Предпросмотр
                        </Button>

                        <Button
                            onClick={handleProcess}
                            disabled={isProcessing || !allFilesUploaded()}
                            tooltip={!allFilesUploaded() ? "Загрузите все необходимые файлы" : undefined}
                        >
                            {isProcessing ? 'Обработка...' : 'Обработать'}
                        </Button>
                    </div>

                    {isProcessing && (
                        <div className="mt-4">
                            <ProgressBar value={progress}/>
                            <p className="text-sm text-muted-foreground mt-2">
                                Прогресс: {progress}%
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}