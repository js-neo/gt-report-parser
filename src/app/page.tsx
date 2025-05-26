// src/app/page.tsx

"use client"

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {FileUpload} from '@/components/FileUpload';
import {ColumnEditor} from '@/components/ColumnEditor';
import { Button } from '@/components/UI/Button';
import { processExcelData } from '@/lib/excelParser';
import type { ExcelData, ColumnConfig } from '@/lib/types';
import {ProgressBar} from "@/components/UI/ProgressBar";

export default function Home() {
    const [excelData, setExcelData] = useState<ExcelData | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const router = useRouter();

    const handleFileUpload = useCallback((data: ExcelData) => {
        setExcelData(data);
        setColumns(data.headers.map(header => ({
            id: header,
            name: header,
            visible: true
        })));
    }, []);

    const handleProcess = async () => {
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

            await processExcelData(excelData!, columns);

            clearInterval(interval);
            setProgress(100);
            router.push('/preview');
        } catch (error) {
            console.error('Processing error:', error);
            setIsProcessing(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">GT-Report Parser</h1>

            {!excelData ? (
                <FileUpload onUpload={handleFileUpload} />
            ) : (
                <div className="space-y-6">
                    <ColumnEditor
                        columns={columns}
                        onChange={setColumns}
                    />

                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/preview')}
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