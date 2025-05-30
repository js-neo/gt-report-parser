// src/app/page.tsx

"use client"

import {useState, useCallback, useEffect} from 'react';
import { useRouter } from 'next/navigation';
import {FileUpload} from '@/components/FileUpload';
import {ColumnEditor} from '@/components/ColumnEditor';
import { Button } from '@/components/UI/Button';
import type { ExcelData, ColumnConfig } from '@/lib/types';
import {ProgressBar} from "@/components/UI/ProgressBar";
import {formatDateTime} from "@/utils";
import {processExcelData} from "@/lib/excelParser";

export default function Home() {
    const [excelData, setExcelData] = useState<ExcelData | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const router = useRouter();

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

    const handleFileUpload = useCallback((data: ExcelData) => {
        setExcelData(data);
        setColumns(data.headers.map(header => ({
            id: header,
            name: header,
            visible: true
        })));
    }, []);

    const processAndSaveData = (columns: ColumnConfig[], data: ExcelData) => {
        const columnMapping = columns.reduce((acc, column) => {
            if (column.visible) {
                acc[column.id] = column.name;
            }
            return acc;
        }, {} as Record<string, string>);

        const processedData = {
            headers: Object.values(columnMapping),
            rows: data.rows.map(row => {
                const processedRow: Record<string, unknown> = {};
                for (const [originalId, newName] of Object.entries(columnMapping)) {

                    if (row[originalId] instanceof Date) {
                        processedRow[newName] = formatDateTime(row[originalId] as Date);
                    } else {
                        processedRow[newName] = row[originalId];
                    }
                }
                return processedRow;
            })
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

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">GT-Report Parser</h1>

            {!excelData ? (
                <FileUpload onUploadAction={handleFileUpload} />
            ) : (
                <div className="space-y-6">
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
                            <ProgressBar value={progress} />
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