// C:\Users\Thariq\Documents\ITS\SEMESTER_4\MBD\FP\my-next-app\src\components\ActiveCustomersTable.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Card from './Card'; // Reusing your Card component
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

// Define interface matching the output of your PostgreSQL VIEW
interface ActiveCustomer {
    c_id: string;
    c_name: string;
    c_phone: string;
    membership_id: number;
    membership_created_date: string; // ISO string
    membership_expiry_date: string; // ISO string
    membership_points: number;
}

interface ActiveCustomersTableProps {
    title?: string;
}

const ActiveCustomersTable: React.FC<ActiveCustomersTableProps> = ({
    title = "Customers with Active Membership"
}) => {
    const [customers, setCustomers] = useState<ActiveCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActiveCustomers = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch data from your new API route
                const res = await fetch('/api/customers/active-membership');
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Failed to fetch active customers from API');
                }
                const data: ActiveCustomer[] = await res.json();
                console.log('Fetched Active Customers:', data); // For debugging
                setCustomers(data);
            } catch (err: any) {
                console.error("Error fetching active customers:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveCustomers();
    }, []);

    return (
        <Card title={title}>
            {loading && <p className="text-center text-gray-600">Loading active customers...</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {!loading && !error && customers.length === 0 && (
                <p className="text-center text-gray-600">No active membership customers found.</p>
            )}

            {!loading && !error && customers.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead>
                            <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                <th className="py-2 px-4 border-b">Customer ID</th>
                                <th className="py-2 px-4 border-b">Name</th>
                                <th className="py-2 px-4 border-b">Phone</th>
                                <th className="py-2 px-4 border-b">Membership ID</th>
                                <th className="py-2 px-4 border-b">Created Date</th>
                                <th className="py-2 px-4 border-b">Expiry Date</th>
                                <th className="py-2 px-4 border-b">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer) => (
                                <tr key={customer.c_id} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{customer.c_id}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{customer.c_name}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{customer.c_phone}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{customer.membership_id}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{dayjs(customer.membership_created_date).format('L')}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{dayjs(customer.membership_expiry_date).format('L')}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{customer.membership_points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default ActiveCustomersTable;