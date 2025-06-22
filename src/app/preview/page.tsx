// src/app/preview/page.tsx
'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/UI/Button';
import {exportToExcel} from "@/lib/excelParser";
import {FileUp, ArrowUp, ArrowDown, ChevronsUpDown} from 'lucide-react';
import {formatDateTime, parseDateTime} from "@/utils";
import {cn} from "@/utils";
import {RowWithSapsanFlag} from "@/lib/types";

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
};

export default function PreviewPage() {
    const router = useRouter();
    const [tableData, setTableData] = useState<{
        headers: string[];
        rows: RowWithSapsanFlag[];
        initialSort?: SortConfig;
    } | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    const isWideColumn = (header: string) => {
        const wideColumnKeywords = ['адрес', 'комментарий', 'comment', 'описание', 'description'];
        return wideColumnKeywords.some(keyword =>
            header.toLowerCase().includes(keyword)
        );
    };

    const isTimeColumn = (header: string) => {
        return header.toLowerCase().includes('время');
    };

    const isNumericColumn = (header: string) => {
        const numericColumns = ['стоимость', 'доплата'];
        const headerLower = header.trim().toLowerCase();
        return numericColumns.some(column => headerLower.includes(column));
    };

    useEffect(() => {
        const savedData = sessionStorage.getItem('processedData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            setTableData(parsedData);
            setSortConfig(parsedData.initialSort || null);
        } else {
            router.push('/');
        }
    }, [router]);

    const dateRange = useMemo(() => {
        if (!tableData) return null;

        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        tableData.headers.forEach((header) => {
            if (isTimeColumn(header)) {
                tableData.rows.forEach(row => {
                    const value = row[header];
                    if (!value) return;

                    const date = parseDateTime(value);
                    if (isNaN(date.getTime())) return;

                    if (!minDate || date < minDate) minDate = date;
                    if (!maxDate || date > maxDate) maxDate = date;
                });
            }
        });

        return minDate && maxDate ? { minDate, maxDate } : null;
    }, [tableData]);

    const getReportFileName = () => {
        if (!dateRange) return 'processed-report';

        const formatDate = (date: Date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${day}.${month}.${date.getFullYear()}`;
        };

        return `отчёт_за_период_${formatDate(dateRange.minDate)}_${formatDate(dateRange.maxDate)}`;
    };

    const sortedRows = useMemo(() => {
        if (!tableData?.rows || !sortConfig) return tableData?.rows || [];
        return [...tableData.rows].sort((a, b) => {
            const valueA = a[sortConfig.key];
            const valueB = b[sortConfig.key];

            if (isTimeColumn(sortConfig.key)) {
                const dateA = parseDateTime(valueA);
                const dateB = parseDateTime(valueB);
                return sortConfig.direction === 'desc' ?
                    dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
            }

            if (isNumericColumn(sortConfig.key)) {
                const numA = Number(valueA) || 0;
                const numB = Number(valueB) || 0;
                return sortConfig.direction === 'desc' ?
                    numB - numA : numA - numB;
            }

            const strA = String(valueA || "").toLowerCase();
            const strB = String(valueB || "").toLowerCase();
            return sortConfig.direction === 'desc' ?
                strB.localeCompare(strA) : strA.localeCompare(strB);
        });
    }, [tableData, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig((prev) => ({
            key,
            direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleBack = () => {
        const savedData = sessionStorage.getItem('processedData');
        if (savedData) {
            sessionStorage.setItem('savedPreviewData', savedData);
        }
        router.push('/');
    };

    const SortIcon = ({column}: { column: string }) => {
        if (sortConfig?.key !== column) {
            return (
                <span className="inline-flex items-center ml-1 text-[2em] opacity-50">
                    <ChevronsUpDown className="w-[1em] h-[1em]"/>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center ml-1 text-[2em]">
                {sortConfig.direction === 'asc' ?
                    <ArrowUp className="w-[1em] h-[1em]"/>
                    : <ArrowDown className="w-[1em] h-[1em]"/>}
            </span>
        );
    };

    if (!tableData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Загрузка данных...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 flex flex-col h-[calc(100vh-1rem)]">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Предпросмотр таблицы</h1>
                <div className="flex gap-2">
                    <Button
                        onClick={handleBack}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        Вернуться к редактированию
                    </Button>
                    <Button
                        onClick={() => exportToExcel(tableData, getReportFileName())}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                        <span className="flex"><FileUp className="w-4 mr-1"/>Экспорт в Excel</span>
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                    <table className="min-w-full bg-background border border-border border-collapse border-gray-300 dark:border-gray-600">
                        <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            {tableData.headers.map((header, index) => (
                                <th
                                    key={index}
                                    onClick={() => handleSort(header)}
                                    className={cn(
                                        "px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase",
                                        "tracking-wider border border-border border-gray-300 dark:border-gray-600",
                                        "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors",
                                        isWideColumn(header)
                                            ? "max-w-[400px] min-w-[400px]"
                                            : "max-w-[150px] min-w-[80px]"
                                    )}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {header}
                                        <SortIcon column={header}/>
                                    </div>
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {sortedRows.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={cn(rowIndex % 2 === 0 ? 'bg-background' : 'bg-gray-50 dark:bg-gray-700',
                                row._isSapsan && 'bg-green-100 dark:bg-green-900',
                                row._isValueError && 'bg-red-100 dark:bg-red-900')}
                            >
                                {tableData.headers.map((header, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={cn(
                                            "px-1 py-2 text-sm text-center text-foreground border border-border",
                                            "border-gray-300 dark:border-gray-600",
                                            isWideColumn(header)
                                                ? "max-w-[400px] min-w-[400px] break-words whitespace-normal"
                                                : "max-w-[150px] min-w-[80px] break-words whitespace-normal"
                                        )}
                                    >
                                        {isTimeColumn(header) && typeof row[header] === 'string' && row[header].toString().includes('T')
                                            ? formatDateTime(new Date(row[header] as string))
                                            : String(row[header] || '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}