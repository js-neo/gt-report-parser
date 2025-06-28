// src/app/preview/page.tsx
'use client';

import React, {useEffect, useMemo, useState, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/UI/Button';
import {exportToExcel} from "@/lib/excelParser";
import {FileUp, ArrowUp, ArrowDown, ChevronsUpDown, Filter} from 'lucide-react';
import {formatDateTime, parseDateTime} from "@/utils";
import {cn} from "@/utils";
import {RowWithSapsanFlag} from "@/lib/types";
import {Modal} from '@/components/UI/Modal';

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
};

type EditState = {
    row: number;
    cell: number;
} | null;

type FilterCondition = {
    type: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greater' | 'less';
    value: string;
};

type FilterConfig = {
    [key: string]: FilterCondition;
};

export default function PreviewPage() {
    const router = useRouter();
    const [tableData, setTableData] = useState<{
        headers: string[];
        rows: RowWithSapsanFlag[];
        initialSort?: SortConfig;
    } | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [edit, setEdit] = useState<EditState>(null);
    const [filters, setFilters] = useState<FilterConfig>({});
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [currentFilterColumn, setCurrentFilterColumn] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    useEffect(() => {
        if (edit) {
            if (isWideColumn(tableData?.headers[edit.cell] || '')) {
                setTimeout(() => textareaRef.current?.focus(), 10);
            } else {
                setTimeout(() => inputRef.current?.focus(), 10);
            }
        }
    }, [edit, tableData]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                setIsFilterModalOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

    const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}.${date.getFullYear()}`;
    };

    const getUniqueValues = (column: string) => {
        if (!tableData) return [];

        const values = new Set<string>();
        tableData.rows.forEach(row => {
            const value = String(row[column] || '').trim();
            if (value) values.add(value);
        });

        return Array.from(values).sort();
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

    const filteredRows = useMemo(() => {
        if (!sortedRows || Object.keys(filters).length === 0) return sortedRows;

        return sortedRows.filter(row => {
            return Object.entries(filters).every(([column, condition]) => {
                const cellValue = String(row[column] || '').toLowerCase();
                const filterValue = condition.value.toLowerCase();

                switch (condition.type) {
                    case 'contains':
                        return cellValue.includes(filterValue);
                    case 'equals':
                        return cellValue === filterValue;
                    case 'startsWith':
                        return cellValue.startsWith(filterValue);
                    case 'endsWith':
                        return cellValue.endsWith(filterValue);
                    case 'greater':
                        if (isNumericColumn(column)) {
                            return Number(row[column] || 0) > Number(filterValue);
                        }
                        return cellValue > filterValue;
                    case 'less':
                        if (isNumericColumn(column)) {
                            return Number(row[column] || 0) < Number(filterValue);
                        }
                        return cellValue < filterValue;
                    default:
                        return true;
                }
            });
        });
    }, [sortedRows, filters]);

    const getReportFileName = () => {
        if (!dateRange) return 'processed-report';

        const filterInfo = Object.entries(filters).map(([column, condition]) => {
            return `${column} (${condition.type}: ${condition.value})`;
        }).join(', ');

        const baseName = `отчёт_за_период_${formatDate(dateRange.minDate)}_${formatDate(dateRange.maxDate)}`;

        return filterInfo
            ? `фильтрация_${baseName}_по_${filterInfo.slice(0, 50)}`
            : baseName;
    };

    const getReportPeriodTitle = () => {
        if (!dateRange) return 'Нет информации о периоде';
        return `Отчёт за период ${formatDate(dateRange.minDate)} - ${formatDate(dateRange.maxDate)}`;
    };

    const handleSort = (key: string) => {
        setSortConfig((prev) => ({
            key,
            direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const applyFilter = (column: string, condition: FilterCondition) => {
        setFilters(prev => ({
            ...prev,
            [column]: condition
        }));
    };

    const clearFilter = (column: string) => {
        setFilters(prev => {
            const newFilters = {...prev};
            delete newFilters[column];
            return newFilters;
        });
    };

    const clearAllFilters = () => {
        setFilters({});
    };

    const handleBack = () => {
        const savedData = sessionStorage.getItem('processedData');
        if (savedData) {
            sessionStorage.setItem('savedPreviewData', savedData);
        }
        router.push('/');
    };

    const showEditor = (rowIndex: number, colIndex: number) => {
        setEdit({
            row: rowIndex,
            cell: colIndex
        });
    };

    const saveEdit = (e: React.FormEvent, rowIndex: number, colIndex: number, newValue: string) => {
        e.preventDefault();

        if (!tableData || edit === null) return;

        const newData = {
            ...tableData,
            rows: [...tableData.rows]
        };

        const headerKey = newData.headers[colIndex];
        newData.rows[rowIndex] = {
            ...newData.rows[rowIndex],
            [headerKey]: newValue
        };

        setTableData(newData);
        setEdit(null);

        sessionStorage.setItem('processedData', JSON.stringify(newData));
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
        rowIndex: number,
        colIndex: number,
        value: string
    ) => {
        if (!tableData) return;

        if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            saveEdit(e, rowIndex, colIndex, value);
        }

        if (e.key === 'Enter' && e.ctrlKey && (e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            saveEdit(e, rowIndex, colIndex, value);
        }

        if (e.key === 'Escape') {
            setEdit(null);
        }

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
            e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();

            let newRow = edit?.row || rowIndex;
            let newCell = edit?.cell || colIndex;

            if (e.key === 'ArrowUp' && newRow > 0) newRow--;
            if (e.key === 'ArrowDown' && newRow < tableData.rows.length - 1) newRow++;
            if (e.key === 'ArrowLeft' && newCell > 0) newCell--;
            if (e.key === 'ArrowRight' && newCell < tableData.headers.length - 1) newCell++;

            if (newRow !== rowIndex || newCell !== colIndex) {
                setEdit({ row: newRow, cell: newCell });
            }
        }
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

    const FilterIcon = ({ column }: { column: string }) => {
        const isFiltered = !!filters[column];

        return (
            <span
                className="inline-flex items-center ml-1 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    setCurrentFilterColumn(column);
                    setIsFilterModalOpen(true);
                }}
                title="Фильтровать (Ctrl+Shift+L)"
            >
                <Filter
                    size={16}
                    className={isFiltered ? "text-blue-500" : "text-current"}
                />
            </span>
        );
    };

    const FilterModalContent = ({
                                    currentFilter,
                                    uniqueValues,
                                    onApply,
                                    onClear,
                                    isNumeric,
                                    isTime
                                }: {
        currentFilter?: FilterCondition;
        uniqueValues: string[];
        onApply: (condition: FilterCondition) => void;
        onClear: () => void;
        isNumeric: boolean;
        isTime: boolean;
    }) => {
        const [filterType, setFilterType] = useState<FilterCondition['type']>(currentFilter?.type || 'contains');
        const [filterValue, setFilterValue] = useState(currentFilter?.value || '');
        const [selectedValues, setSelectedValues] = useState<string[]>([]);

        const handleApply = () => {
            if (selectedValues.length > 0) {
                onApply({
                    type: 'equals',
                    value: selectedValues.join('|')
                });
            } else if (filterValue.trim()) {
                onApply({
                    type: filterType,
                    value: filterValue
                });
            }
            setIsFilterModalOpen(false);
        };

        const handleClear = () => {
            onClear();
            setIsFilterModalOpen(false);
        };

        const filterTypes = [
            { value: 'contains', label: 'содержит' },
            { value: 'equals', label: 'равно' },
            { value: 'startsWith', label: 'начинается с' },
            { value: 'endsWith', label: 'заканчивается на' },
        ];

        if (isNumeric || isTime) {
            filterTypes.push(
                { value: 'greater', label: 'больше чем' },
                { value: 'less', label: 'меньше чем' }
            );
        }

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Тип фильтра</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as FilterCondition['type'])}
                            className="w-full p-2 border rounded-md"
                        >
                            {filterTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Значение</label>
                        <input
                            type={isNumeric ? 'number' : 'text'}
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="Введите значение..."
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Или выберите из списка:</label>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                        {uniqueValues.length > 0 ? (
                            uniqueValues.map((value) => (
                                <div key={value} className="flex items-center gap-2 p-1 hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        id={`value-${value}`}
                                        checked={selectedValues.includes(value)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedValues([...selectedValues, value]);
                                            } else {
                                                setSelectedValues(selectedValues.filter(v => v !== value));
                                            }
                                        }}
                                    />
                                    <label htmlFor={`value-${value}`} className="text-sm">
                                        {value}
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">Нет уникальных значений</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-between pt-4 border-t">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                    >
                        Сбросить
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsFilterModalOpen(false)}
                            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleApply}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Применить
                        </button>
                    </div>
                </div>
            </div>
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
                <div>
                    <h1 className="text-3xl font-bold">Предпросмотр таблицы</h1>
                    <h2 className="font-light">{getReportPeriodTitle()}</h2>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={handleBack}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        Вернуться к редактированию
                    </Button>
                    <Button
                        onClick={clearAllFilters}
                        variant="outline"
                        className="flex items-center gap-2"
                        disabled={Object.keys(filters).length === 0}
                    >
                        Сбросить фильтры
                    </Button>
                    <Button
                        onClick={() => exportToExcel({
                            ...tableData,
                            rows: filteredRows
                        }, getReportFileName())}
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
                                            : "max-w-[150px] min-w-[80px]",
                                        filters[header] && "bg-blue-50 dark:bg-blue-900"
                                    )}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {header}
                                        <SortIcon column={header}/>
                                        <FilterIcon column={header}/>
                                    </div>
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {filteredRows.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={cn(rowIndex % 2 === 0 ? 'bg-background' : 'bg-gray-50 dark:bg-gray-700',
                                    row._isSapsan && 'bg-green-100 dark:bg-green-900',
                                    row._isValueError && 'bg-red-100 dark:bg-red-900')}
                            >
                                {tableData.headers.map((header, colIndex) => (
                                    <td
                                        key={colIndex}
                                        onDoubleClick={() => showEditor(rowIndex, colIndex)}
                                        data-row={rowIndex}
                                        className={cn(
                                            "px-1 py-2 text-sm text-center text-foreground border border-border",
                                            "border-gray-300 dark:border-gray-600",
                                            isWideColumn(header)
                                                ? "max-w-[400px] min-w-[400px] break-words whitespace-normal"
                                                : "max-w-[150px] min-w-[80px] break-words whitespace-normal",
                                            edit?.row === rowIndex && edit?.cell === colIndex
                                                ? "bg-blue-50 dark:bg-blue-900" : ""
                                        )}
                                    >
                                        {edit?.row === rowIndex && edit?.cell === colIndex ? (
                                            isWideColumn(header) ? (
                                                <form
                                                    onSubmit={(e) => saveEdit(e, rowIndex, colIndex, String(row[header] || ''))}
                                                    className="w-full"
                                                >
                                                    <textarea
                                                        ref={textareaRef}
                                                        defaultValue={String(row[header] || '')}
                                                        autoFocus
                                                        onBlur={() => setEdit(null)}
                                                        onKeyDown={(e) =>
                                                            handleKeyDown(e, rowIndex, colIndex, e.currentTarget.value)
                                                        }
                                                        className={cn(
                                                            "w-full min-h-[100px] p-1 border rounded-md bg-white dark:bg-gray-800",
                                                            "border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none",
                                                            "resize-y"
                                                        )}
                                                    />
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        Ctrl+Enter для сохранения
                                                    </div>
                                                </form>
                                            ) : (
                                                <form
                                                    onSubmit={(e) => saveEdit(e, rowIndex, colIndex, String(row[header] || ''))}
                                                    className="w-full"
                                                >
                                                    <input
                                                        ref={inputRef}
                                                        type="text"
                                                        defaultValue={String(row[header] || '')}
                                                        autoFocus
                                                        onBlur={() => setEdit(null)}
                                                        onKeyDown={(e) =>
                                                            handleKeyDown(e, rowIndex, colIndex, e.currentTarget.value)
                                                        }
                                                        className={cn(
                                                            "w-full p-1 border rounded-md bg-white dark:bg-gray-800",
                                                            "border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        )}
                                                    />
                                                </form>
                                            )
                                        ) : (
                                            isTimeColumn(header) && typeof row[header] === 'string' && row[header].toString().includes('T')
                                                ? formatDateTime(new Date(row[header] as string))
                                                : String(row[header] || ''))
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isFilterModalOpen}
                onCloseAction={() => {
                    setIsFilterModalOpen(false);
                    setCurrentFilterColumn(null);
                }}
                title={`Фильтрация по колонке: ${currentFilterColumn || ''}`}
                size="md"
            >
                {currentFilterColumn && (
                    <FilterModalContent
                        currentFilter={filters[currentFilterColumn]}
                        uniqueValues={getUniqueValues(currentFilterColumn)}
                        onApply={(condition) => applyFilter(currentFilterColumn, condition)}
                        onClear={() => clearFilter(currentFilterColumn)}
                        isNumeric={isNumericColumn(currentFilterColumn)}
                        isTime={isTimeColumn(currentFilterColumn)}
                    />
                )}
            </Modal>
        </div>
    );
}