// src/components/FileUpload.tsx

'use client';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/UI/Button';
import { FileUp } from 'lucide-react';
import type { ExcelData } from '@/lib/types';
import { parseExcelFile, parseCSVFile } from '@/lib/excelParser';
import { cn } from "@/utils";

interface FileUploadProps {
    onUploadAction: (data: ExcelData) => void;
    acceptOnly?: string[];
}

export const FileUpload = ({ onUploadAction, acceptOnly }: FileUploadProps) => {
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            let data: ExcelData;

            if (file.name.endsWith('.csv')) {
                data = await parseCSVFile(file);
            } else {
                data = await parseExcelFile(file);
            }

            if (acceptOnly) {
                const missingHeaders = acceptOnly.filter(header =>
                    !data.headers.some(h =>
                        h.toLowerCase().includes(header.toLowerCase()))
                );

                if (missingHeaders.length > 0) {
                    alert(`В файле отсутствуют обязательные колонки: ${missingHeaders.join(', ')}`);
                    return;
                }
            }

            onUploadAction(data);
        } catch (error) {
            console.error('Error parsing Excel:', error);
            alert('Ошибка при чтении файла');
        }
    }, [onUploadAction, acceptOnly]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        }
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer",
                isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
            )}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
                <FileUp className="w-12 h-12 text-primary" />
                <div>
                    <Button variant="outline" size="lg">
                        Выберите файл
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                        или перетащите файл сюда
                    </p>
                </div>
                <p className="text-sm text-muted-foreground">
                    Поддерживаются файлы .xlsx, .xls и .csv
                </p>
            </div>
        </div>
    );
};