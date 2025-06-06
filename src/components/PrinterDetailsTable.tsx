'use client';

import React, { useState, useEffect } from 'react';
import Card from './Card';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

// Define interface matching the output of your PostgreSQL function
// Note: Column names from RPC calls are usually lowercase in JavaScript
interface PrinterFunctionDetail {
    p_id: string;
    p_status: boolean;
    p_condition: string;
    assigned_staff_names: string | null; // This will be a comma-separated string from STRING_AGG
    latest_maintenance_date: string | null; // This will be an ISO string or null
    latest_maintenance_brand: string | null;
    latest_maintenance_price: number | null;
    latest_maintenance_notes: string | null;
}

interface PrinterDetailsTableProps {
    title?: string;
}

const PrinterDetailsTable: React.FC<PrinterDetailsTableProps> = ({
    title = "Complex Query (printer & maintenance)"
}) => {
    const [printerDetails, setPrinterDetails] = useState<PrinterFunctionDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrinterDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch data from your new API route
                const res = await fetch('/api/printers/function-details');
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Failed to fetch printer details from function API');
                }
                const data: PrinterFunctionDetail[] = await res.json();
                console.log('Fetched Printer Details from Function:', data); // For debugging
                setPrinterDetails(data);
            } catch (err: any) {
                console.error("Error fetching printer details:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPrinterDetails();
    }, []);

    return (
        <Card title={title}>
            {loading && <p className="text-center text-gray-600">Loading printer details...</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {!loading && !error && printerDetails.length === 0 && (
                <p className="text-center text-gray-600">No printer details found from function.</p>
            )}

            {!loading && !error && printerDetails.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead>
                            <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                <th className="py-2 px-4 border-b">ID</th>
                                <th className="py-2 px-4 border-b">Status</th>
                                <th className="py-2 px-4 border-b">Condition</th>
                                <th className="py-2 px-4 border-b">Assigned Staff</th>
                                <th className="py-2 px-4 border-b">Latest Maint. Date</th>
                                <th className="py-2 px-4 border-b">Maint. Brand</th>
                                <th className="py-2 px-4 border-b">Maint. Price</th>
                                <th className="py-2 px-4 border-b">Maint. Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printerDetails.map((detail) => (
                                <tr key={detail.p_id} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{detail.p_id}</td>
                                    <td className="py-2 px-4 border-b text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            detail.p_status
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {detail.p_status ? 'Operational' : 'In Maintenance'}
                                        </span>
                                    </td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{detail.p_condition}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">
                                        {detail.assigned_staff_names || 'N/A'}
                                    </td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">
                                        {detail.latest_maintenance_date ? dayjs(detail.latest_maintenance_date).format('L') : 'N/A'}
                                    </td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">
                                        {detail.latest_maintenance_brand || 'N/A'}
                                    </td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">
                                        {detail.latest_maintenance_price !== null ? `Rp ${detail.latest_maintenance_price.toLocaleString('id-ID')}` : 'N/A'}
                                    </td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">
                                        {detail.latest_maintenance_notes || 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default PrinterDetailsTable;