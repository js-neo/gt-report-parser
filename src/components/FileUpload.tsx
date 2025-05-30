// src/components/FileUpload.tsx

'use client';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/UI/Button';
import { FileUp } from 'lucide-react';
import type { ExcelData } from '@/lib/types';
import { parseExcelFile } from '@/lib/excelParser';
import {cn} from "@/utils";

interface FileUploadProps {
    onUploadAction: (data: ExcelData) => void;
}

export const FileUpload = ({ onUploadAction }: FileUploadProps) => {
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            const data = await parseExcelFile(file);
            onUploadAction(data);
        } catch (error) {
            console.error('Error parsing Excel:', error);
            alert('Ошибка при чтении файла');
        }
    }, [onUploadAction]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
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
                    Поддерживаются файлы .xlsx и .xls
                </p>
            </div>
        </div>
    );
};