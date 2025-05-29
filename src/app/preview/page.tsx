// src/app/preview/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/UI/Button';
import { exportToExcel } from "@/lib/excelParser";
import { FileUp } from 'lucide-react';
import { formatDateTime } from "@/utils";
import { cn } from "@/utils";

export default function PreviewPage() {
    const router = useRouter();
    const [tableData, setTableData] = useState<{
        headers: string[];
        rows: Record<string, unknown>[];
    } | null>(null);

    useEffect(() => {
        const savedData = sessionStorage.getItem('processedData');
        if (savedData) {
            setTableData(JSON.parse(savedData));
        } else {
            router.push('/');
        }
    }, [router]);

    const handleBack = () => {
        const savedData = sessionStorage.getItem('processedData');
        if (savedData) {
            sessionStorage.setItem('savedPreviewData', savedData);
        }
        router.push('/');
    };

    const isWideColumn = (header: string) => {
        const wideColumnKeywords = ['адрес', 'комментарий', 'comment', 'описание', 'description'];
        return wideColumnKeywords.some(keyword =>
            header.toLowerCase().includes(keyword)
        );
    };

    const isTimeColumn = (header: string) => {
        return header.toLowerCase().includes('время');
    };

    if (!tableData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Загрузка данных...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
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
                        onClick={() => exportToExcel(tableData, 'processed-report')}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                        <span className="flex"><FileUp className="w-4 mr-1" />Экспорт в Excel</span>
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full bg-white dark:bg-gray-800">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                        {tableData.headers.map((header, index) => (
                            <th
                                key={index}
                                className={cn(
                                    "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
                                    isWideColumn(header) && "max-w-[400px]"
                                )}
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tableData.rows.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}
                        >
                            {tableData.headers.map((header, colIndex) => (
                                <td
                                    key={colIndex}
                                    className={cn(
                                        "px-6 py-4 text-sm text-gray-900 dark:text-gray-100",
                                        isWideColumn(header)
                                            ? "max-w-[400px] break-words whitespace-normal"
                                            : "whitespace-nowrap"
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
    );
}