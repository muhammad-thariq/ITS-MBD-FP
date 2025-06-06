// C:\Users\Thariq\Documents\ITS\SEMESTER_4\MBD\FP\my-next-app\src\components\InventoryTableFromFunction.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Card from './Card'; // Assuming you want to wrap it in your Card component

// Define interface matching the output of your PostgreSQL function
interface InventoryDetail {
    i_id: string;
    i_name: string;
    i_stock: number;
    i_price: number;
}

interface InventoryTableFromFunctionProps {
    title?: string;
}

const InventoryTableFromFunction: React.FC<InventoryTableFromFunctionProps> = ({
    title = "Inventory Details (from PostgreSQL Function)"
}) => {
    const [inventory, setInventory] = useState<InventoryDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInventory = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch data from your new API route
                const res = await fetch('/api/inventory/details');
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Failed to fetch inventory details from function API');
                }
                const data: InventoryDetail[] = await res.json();
                console.log('Fetched Inventory Details from Function:', data); // For debugging
                setInventory(data);
            } catch (err: any) {
                console.error("Error fetching inventory details:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();
    }, []);

    return (
        <Card title={title}>
            {loading && <p className="text-center text-gray-600">Loading inventory details...</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {!loading && !error && inventory.length === 0 && (
                <p className="text-center text-gray-600">No inventory details found.</p>
            )}

            {!loading && !error && inventory.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead>
                            <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                <th className="py-2 px-4 border-b">ID</th>
                                <th className="py-2 px-4 border-b">Name</th>
                                <th className="py-2 px-4 border-b">Stock</th>
                                <th className="py-2 px-4 border-b">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.map((item) => (
                                <tr key={item.i_id} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{item.i_id}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{item.i_name}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">{item.i_stock}</td>
                                    <td className="py-2 px-4 border-b text-sm text-gray-800">Rp {item.i_price.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default InventoryTableFromFunction;