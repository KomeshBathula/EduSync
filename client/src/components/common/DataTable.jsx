import React from 'react';
import Card from './Card';

const DataTable = ({ columns, data = [], keyField = 'id', className = '' }) => {
    return (
        <Card className={`overflow-x-auto ${className}`} level={1}>
            <table className="min-w-full divide-y divide-border-base">
                <thead className="bg-surface border-b border-border-base relative">
                    <tr>
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                scope="col"
                                className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider sticky top-0 bg-surface z-10"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border-subtle">
                    {data.map((row, rowIdx) => (
                        <tr
                            key={row[keyField] || rowIdx}
                            className={`${rowIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-alt'} hover:bg-surface-hover transition-colors`}
                        >
                            {columns.map((col, colIdx) => (
                                <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                    {col.cell ? col.cell(row) : row[col.accessorKey]}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-8 text-center text-sm text-text-secondary">
                                No data available
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </Card>
    );
};

export default DataTable;
