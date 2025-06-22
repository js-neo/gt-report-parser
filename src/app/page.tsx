"use client"

import {useState, useCallback, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Check, ChevronRight, X} from 'lucide-react';
import {FileUpload} from '@/components/FileUpload';
import {ColumnEditor} from '@/components/ColumnEditor';
import {Button} from '@/components/UI/Button';
import type {ExcelData, ColumnConfig, RowWithSapsanFlag} from '@/lib/types';
import {ProgressBar} from "@/components/UI/ProgressBar";
import {formatDateTime} from "@/utils";
import {processExcelData} from "@/lib/excelParser";
import {Toggle} from "@/components/UI/Toggle";
import {Label} from "@/components/UI/Label";

type UploadStep = 'main-spb' | 'partner-spb' | 'main-moscow' | 'partner-moscow';

const minRateSPB = {
    base: 2250
};

const minRateMSK = {
    base: 3200,
    domodedovo: 4100,
    gukovskiy: 4500,
    port_port: 6000
};

export default function Home() {
    const [excelDataSPB, setExcelDataSPB] = useState<ExcelData | null>(null);
    const [partnerDataSPB, setPartnerDataSPB] = useState<ExcelData | null>(null);
    const [excelDataMoscow, setExcelDataMoscow] = useState<ExcelData | null>(null);
    const [partnerDataMoscow, setPartnerDataMoscow] = useState<ExcelData | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isSLVMode, setIsSLVMode] = useState(true);
    const [currentStep, setCurrentStep] = useState<UploadStep>('main-spb');
    const router = useRouter();

    const slvTableHeaders = ['Номер заказа', 'Время заказа', 'Текущий статус', 'Стоимость', 'Сумма клиента',
        'Организация', 'Адрес', 'Исполнитель', 'Автомобиль', 'Комментарий', 'Клиент', 'Парк партнёр', 'Доплата'];

    useEffect(() => {
        const savedPreviewData = sessionStorage.getItem('savedPreviewData');
        if (savedPreviewData) {
            const parsedData = JSON.parse(savedPreviewData);
            setExcelDataSPB({
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

    const checkCityAddress = (data: ExcelData, city: string): boolean => {
        const addressColumn = data.headers.find(header =>
            header.toLowerCase().includes('адрес'));
        if (!addressColumn) return false;
        return data.rows.some(row =>
            String(row[addressColumn]).toLowerCase().includes(city.toLowerCase()));
    };

    const goToStep = (step: UploadStep) => {
        setCurrentStep(step);
    };

    const handleFileUpload = useCallback((data: ExcelData, fileType: UploadStep) => {
        const city = fileType.includes('spb') ? 'санкт-петербург' : 'москва';
        if (!checkCityAddress(data, city)) {
            alert(`В файле не найдены адреса с указанием города ${city}`);
            return false;
        }

        if (fileType === 'main-spb') {
            setExcelDataSPB(data);
            setCurrentStep('partner-spb');
        } else if (fileType === 'main-moscow') {
            setExcelDataMoscow(data);
            setCurrentStep('partner-moscow');
        } else if (fileType === 'partner-spb') {
            const hasPartnerColumn = data.headers.find(header =>
                header.toLowerCase().includes('партнер'));

            if (!hasPartnerColumn) {
                alert('В файле партнёра отсутствует колонка "Партнер"');
                return false;
            }
            setPartnerDataSPB(data);
            setCurrentStep('main-moscow');
        } else if (fileType === 'partner-moscow') {
            const hasPartnerColumn = data.headers.find(header =>
                header.toLowerCase().includes('партнер'));

            if (!hasPartnerColumn) {
                alert('В файле партнёра отсутствует колонка "Партнер"');
                return false;
            }
            setPartnerDataMoscow(data);
        }

        if (fileType.includes('main')) {
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
        }
        return true;
    }, [isSLVMode]);

    const getUploadDescription = (step: UploadStep): string => {
        switch (step) {
            case 'main-spb':
                return 'Загрузите основной файл для Санкт-Петербурга';
            case 'partner-spb':
                return 'Загрузите файл партнёров для Санкт-Петербурга (должен содержать колонки "Номер заказа" и "Партнер")';
            case 'main-moscow':
                return 'Загрузите основной файл для Москвы';
            case 'partner-moscow':
                return 'Загрузите файл партнёров для Москвы (должен содержать колонки "Номер заказа" и "Партнер")';
            default:
                return '';
        }
    };

    const StepHeader = ({
                            completed,
                            current,
                            stepNumber,
                            title,
                            onClick
                        }: {
        completed: boolean;
        current: boolean;
        stepNumber: number;
        title: string;
        onClick?: () => void;
    }) => (
        <div
            className={`flex items-center gap-3 mb-4 ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={onClick}
        >
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                current ? 'bg-blue-500 text-white' :
                    completed ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}>
                {completed ? <Check size={16}/> : stepNumber}
            </div>
            <h3 className="text-lg font-medium">{title}</h3>
        </div>
    );

    const combineData = (): ExcelData | null => {
        if (!excelDataSPB || !excelDataMoscow) return null;

        return {
            headers: excelDataSPB.headers,
            rows: [...excelDataSPB.rows, ...excelDataMoscow.rows]
        };
    };

    const removePhoneNumber = (text: string): string => {
        const countryCodeRegex = /(\+7|7|8)\d{10}|(\+7|7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g;
        const localPhoneRegex = /9\d{9}|\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g;

        let result = text;
        let hasCountryCodeNumbers = false;

        let match;
        while ((match = countryCodeRegex.exec(text)) !== null) {
            // console.log(`[Номер с кодом] Найдено: "${match[0]}" (позиция ${match.index})`);
            result = result.replace(match[0], '');
            hasCountryCodeNumbers = true;
        }

        if (!hasCountryCodeNumbers) {
            while ((match = localPhoneRegex.exec(text)) !== null) {
                // console.log(`[Локальный номер] Найдено: "${match[0]}" (позиция ${match.index})`);
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

        if (!isSLVMode) {
            const processedData = {
                headers: data.headers,
                rows: data.rows.map(row => ({...row})),
                initialSort: null
            };
            sessionStorage.setItem('processedData', JSON.stringify(processedData));
            return processedData;
        }

        let rows = [...data.rows];

        const timeColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('время заказа')
        );

        const commentColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('комментарий'));

        const addressColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('адрес'));

        const costColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('стоимость'));

        const extraPaymentColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('доплата'));

        const executorColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('исполнитель'));

        const customerColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().includes('заказчик'));

        const clientColumnKey = Object.keys(columnMapping).find(key =>
            columnMapping[key].toLowerCase().trim() === 'клиент');

        const findTollPayments = (comment: string) => {
            if (!comment) return [];

            const tollRoadPatterns = [
                {
                    regex: /(платные? дороги?|платка|зсд)[^\d]*(\d+)\s*вкл/gi,
                    processMatch: (match: RegExpExecArray) => parseInt(match[2], 10)
                },
                {
                    regex: /зсд\/\+\s*(\d+)\s*зсд\s*вкл/gi,
                    processMatch: (match: RegExpExecArray) => parseInt(match[1], 10)
                }
            ];

            const parkingPatterns = [
                {
                    regex: /(платные? парковки?|парковка)[^\d]*(\d+)\s*вкл/gi,
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
                        console.log(`[toll_road] Найдено: "${match[0]}" (сумма: ${amount})`);
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
                        console.log(`[parking] Найдено: "${match[0]}" (сумма: ${amount})`);
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
                console.log('Итоговые платежи:', payments);
            }

            return payments;
        };

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

        rows = rows.map(row => {

            const processedRow: RowWithSapsanFlag = {...row, _isSapsan: false, _isValueError: false};

            if (clientColumnKey) {
                processedRow[clientColumnKey] = '';
            }

            if (commentColumnKey && row[commentColumnKey]) {
                processedRow[commentColumnKey] = removePhoneNumber(String(row[commentColumnKey]));
            }

            if (commentColumnKey && customerColumnKey) {
                const comment = String(processedRow[commentColumnKey] || '').toLowerCase();

                if (comment.includes('сапсан наличные')) {
                    processedRow._isSapsan = true;
                    processedRow[customerColumnKey] = 'Сапсан';
                }
            }

            /*console.log(`!processedRow[executorColumnKey] заказ ${processedRow['Номер заказа']}: `, executorColumnKey &&
            typeof processedRow[executorColumnKey] === 'string' ?
                processedRow[executorColumnKey].length : "Нет колонки Исполнитель");*/
            if (commentColumnKey && executorColumnKey) {

                const executorValue = String(processedRow[executorColumnKey] || '').trim();
                const comment = String(processedRow[commentColumnKey] || '').trim().toLowerCase();

                if (!executorValue) {
                    const isAsonov = (comment: string): boolean =>
                        comment.includes('асонов');

                    const yandexPatterns = [
                        /я$/i, /як$/i, /яким$/i, /яков$/i, /\dя$/i, /\dяк$/i, /\dяким$/i, /\dяков$/i,
                        /я\d{3}$/i, /\dя\d{3}$/i, /\/я$/i, /\/як$/i, /\/яким$/i, /\/яков$/i,
                        /\/яков/i, /\/яким/i, /\sя$/i, /\sяк$/i, /\sяким$/i, /\sяков$/i,
                        /я[^а-яё]*$/i, /як[^а-яё]*$/i, /яким[^а-яё]*$/i
                    ];

                    const isYandex = (comment: string): boolean => {
                        const exceptionRegs = [/ния$/i, /парадная\s*\d*$/i];
                        const isException = exceptionRegs.some(reg => reg.test(comment));
                        if (isException) return false;
                        return yandexPatterns.some(pattern => pattern.test(comment));
                    };

                    const viliPatterns = [
                        /влад\d{3}$/i, /\/в$/i, /в$/i, /\/в\s*$/i, /\dв\d{3}$/i, /\d\/в/i, /\dв$/i,
                    ];

                    const isVili = (comment: string): boolean => {
                        const exceptionRegs = [/ов$/];
                        const isException = exceptionRegs.some(reg => reg.test(comment));
                        if (isException) return false;
                        return viliPatterns.some(pattern => pattern.test(comment));
                    };

                    const executorPatterns = [
                        {test: isAsonov, value: 'Асонов'},
                        {test: isYandex, value: 'Яндекс'},
                        {test: isVili, value: 'Вили'},
                    ];

                    const executor = executorPatterns.find(({test}) => test(comment))?.value;

                    if (executor) processedRow[executorColumnKey] = executor;
                }
            }

            if (commentColumnKey && addressColumnKey && costColumnKey && extraPaymentColumnKey && !processedRow._isSapsan) {
                const comment = String(processedRow[commentColumnKey] || '');
                const address = String(processedRow[addressColumnKey] || '');
                const currentCost = Number(processedRow[costColumnKey]) || 0;

                console.log(`Заказ ${processedRow['Номер заказа']} стоимость: ${currentCost}`);

                const payments = findTollPayments(comment);
                if (payments.length > 0) {
                    const city = getCityFromAddress(address);

                    if (!city) {
                        processedRow._isValueError = true;
                        return processedRow;
                    }

                    const minRate = city === 'spb' ? minRateSPB.base : getMoscowMinRate(address);

                    if (currentCost <= minRate) {
                        processedRow._isValueError = true;
                        return processedRow;
                    }

                    const totalExtra = payments.reduce((sum, payment) => sum + payment.amount, 0);

                    processedRow[costColumnKey] = currentCost - totalExtra;
                    processedRow[extraPaymentColumnKey] = (Number(processedRow[extraPaymentColumnKey]) || 0) + totalExtra;
                } else if (
                    /(платные? дороги?|платка|зсд|платные? парковки?|парковка)/i.test(comment) &&
                    !/вкл/i.test(comment)
                ) {
                    processedRow._isValueError = true;
                }
            }

            return processedRow;
        });

        if (partnerDataSPB || partnerDataMoscow) {
            const partnerMapping: Record<string, string> = {};

            [partnerDataSPB, partnerDataMoscow]
                .filter((data): data is ExcelData => data !== null)
                .forEach(data => {
                data.rows.forEach(row => {
                    const orderNumber = row['Номер заказа'];
                    const partner = row['Партнер'];
                    if (orderNumber && partner) {
                        partnerMapping[String(orderNumber)] = String(partner);
                    }
                });
            });

            rows = rows.map(row => ({
                ...row,
                'Парк партнёр': partnerMapping[String(row['Номер заказа'])] || '',
                'Доплата': row['Доплата'] || ''
            }));
        }

        const processedData = {
            headers: Object.values(columnMapping),
            rows: rows.map(row => {
                const processedRow: RowWithSapsanFlag = {};
                const typedRow = row as RowWithSapsanFlag;
                for (const [originalId, newName] of Object.entries(columnMapping)) {
                    if (row[originalId] instanceof Date) {
                        processedRow[newName] = formatDateTime(row[originalId] as Date);
                    } else {
                        processedRow[newName] = row[originalId];
                    }
                }
                processedRow._isSapsan = typedRow._isSapsan;
                processedRow._isValueError = typedRow._isValueError;
                return processedRow;
            }),
            initialSort: timeColumnKey ? {
                key: columnMapping[timeColumnKey],
                direction: 'asc' as const
            } : null
        };

        sessionStorage.setItem('processedData', JSON.stringify(processedData));
        return processedData;
    }


    const handleProcess = async () => {
        const data = isSLVMode ? combineData() : excelDataSPB;
        if (!data) return;

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

            await processExcelData(data, columns);
            processAndSaveData(columns, data);

            clearInterval(interval);
            setProgress(100);
            router.push('/preview');
        } catch (error) {
            console.error('Processing error:', error);
            setIsProcessing(false);
        }
    };

    const handlePreview = () => {
        const data = isSLVMode ? combineData() : excelDataSPB;
        if (!data) return;

        processAndSaveData(columns, data);
        router.push('/preview');
    };

    const allFilesUploaded = () => {
        if (!isSLVMode) return !!excelDataSPB;
        return !!excelDataSPB && !!partnerDataSPB && !!excelDataMoscow && !!partnerDataMoscow;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">GT-Report Parser</h1>

            {!allFilesUploaded() ? (
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
                        <div className="space-y-8">
                            <div
                                className={`border p-6 rounded-lg transition-all ${currentStep === 'main-spb' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                <StepHeader
                                    completed={!!excelDataSPB}
                                    current={currentStep === 'main-spb'}
                                    stepNumber={1}
                                    title="Основной файл Санкт-Петербург"
                                    onClick={excelDataSPB ? () => goToStep('main-spb') : undefined}
                                />
                                {currentStep === 'main-spb' && (
                                    <>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {getUploadDescription('main-spb')}
                                        </p>
                                        <FileUpload
                                            onUploadAction={(data) => handleFileUpload(data, 'main-spb')}
                                        />
                                    </>
                                )}
                            </div>

                            <ChevronRight className="mx-auto text-gray-400"/>

                            <div
                                className={`border p-6 rounded-lg transition-all ${currentStep === 'partner-spb' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                <StepHeader
                                    completed={!!partnerDataSPB}
                                    current={currentStep === 'partner-spb'}
                                    stepNumber={2}
                                    title="Файл партнёра Санкт-Петербург"
                                    onClick={partnerDataSPB ? () => goToStep('partner-spb') : undefined}
                                />
                                {currentStep === 'partner-spb' && (
                                    <>
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-sm text-muted-foreground">
                                                {getUploadDescription('partner-spb')}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => goToStep('main-spb')}
                                            >
                                                ← Назад
                                            </Button>
                                        </div>
                                        <FileUpload
                                            onUploadAction={(data) => handleFileUpload(data, 'partner-spb')}
                                            acceptOnly={['Номер заказа', 'Партнер']}
                                        />
                                    </>
                                )}
                            </div>

                            <ChevronRight className="mx-auto text-gray-400"/>

                            <div
                                className={`border p-6 rounded-lg transition-all ${currentStep === 'main-moscow' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                <StepHeader
                                    completed={!!excelDataMoscow}
                                    current={currentStep === 'main-moscow'}
                                    stepNumber={3}
                                    title="Основной файл Москва"
                                    onClick={excelDataMoscow ? () => goToStep('main-moscow') : undefined}
                                />
                                {currentStep === 'main-moscow' && (
                                    <>
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-sm text-muted-foreground">
                                                {getUploadDescription('main-moscow')}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => goToStep('partner-spb')}
                                            >
                                                ← Назад
                                            </Button>
                                        </div>
                                        <FileUpload
                                            onUploadAction={(data) => handleFileUpload(data, 'main-moscow')}
                                        />
                                    </>
                                )}
                            </div>

                            <ChevronRight className="mx-auto text-gray-400"/>

                            <div
                                className={`border p-6 rounded-lg transition-all ${currentStep === 'partner-moscow' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                <StepHeader
                                    completed={!!partnerDataMoscow}
                                    current={currentStep === 'partner-moscow'}
                                    stepNumber={4}
                                    title="Файл партнёра Москва"
                                    onClick={partnerDataMoscow ? () => goToStep('partner-moscow') : undefined}
                                />
                                {currentStep === 'partner-moscow' && (
                                    <>
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-sm text-muted-foreground">
                                                {getUploadDescription('partner-moscow')}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => goToStep('main-moscow')}
                                            >
                                                ← Назад
                                            </Button>
                                        </div>
                                        <FileUpload
                                            onUploadAction={(data) => handleFileUpload(data, 'partner-moscow')}
                                            acceptOnly={['Номер заказа', 'Партнер']}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="border p-6 rounded-lg">
                            <h3 className="text-lg font-medium mb-4">Загрузите основной файл</h3>
                            <FileUpload onUploadAction={(data) => {
                                setExcelDataSPB(data);
                                setColumns(data.headers.map(header => ({
                                    id: header,
                                    name: header,
                                    visible: true
                                })));
                            }}/>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {isSLVMode && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="border p-3 rounded-lg bg-green-50">
                                <p className="text-sm font-medium">СПБ основной: ✅</p>
                            </div>
                            <div className="border p-3 rounded-lg bg-green-50">
                                <p className="text-sm font-medium">СПБ партнёр: ✅</p>
                            </div>
                            <div className="border p-3 rounded-lg bg-green-50">
                                <p className="text-sm font-medium">Москва основной: ✅</p>
                            </div>
                            <div className="border p-3 rounded-lg bg-green-50">
                                <p className="text-sm font-medium">Москва партнёр: ✅</p>
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
                        >
                            Предпросмотр
                        </Button>

                        <Button
                            onClick={handleProcess}
                            disabled={isProcessing}
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