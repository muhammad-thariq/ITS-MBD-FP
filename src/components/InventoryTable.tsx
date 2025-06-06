// src/components/InventoryTable.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from './Card'; // Reusing your Card component

// Define interface for Inventory Item
interface InventoryItem {
    i_id: string;
    i_name: string;
    i_stock: number;
    i_price: number;
}

// Dedicated interface for the form state
interface InventoryFormState {
    i_id?: string; // Optional for add, required for edit
    i_name: string;
    i_stock: string; // Use string for input, convert to number for API
    i_price: string; // Use string for input, convert to number for API
}

interface InventoryTableProps {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    showAddButton?: boolean;
    showActions?: boolean;
    title?: string;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
    orderBy = 'i_id',
    orderDirection = 'asc',
    showAddButton = true,
    showActions = true,
    title = "Inventory Management",
}) => {
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentInventoryItem, setCurrentInventoryItem] = useState<InventoryItem | null>(null);

    const [formState, setFormState] = useState<InventoryFormState>({
        i_name: '',
        i_stock: '0',
        i_price: '0.00',
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 5;

    // Function to fetch inventory data from the API
    const fetchInventory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const params = new URLSearchParams();
            params.append('limit', itemsPerPage.toString());
            params.append('offset', offset.toString());
            params.append('orderBy', orderBy);
            params.append('orderDirection', orderDirection);

            const url = `/api/inventory?${params.toString()}`;
            const res = await fetch(url);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch inventory items');
            }
            const { inventoryItems: fetchedItems, totalCount } = await res.json();
            setInventoryItems(fetchedItems);
            setTotalPages(Math.ceil(totalCount / itemsPerPage));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentPage, orderBy, orderDirection]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // Handlers for pagination
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    // Form Input Change Handler
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Add/Edit Submit Handler
    const handleAddEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Convert string inputs to numbers
        const payload = {
            i_name: formState.i_name,
            i_stock: parseInt(formState.i_stock, 10),
            i_price: parseFloat(formState.i_price),
        };

        // Basic validation for stock and price
        if (isNaN(payload.i_stock) || payload.i_stock < 0) {
            setError('Stock must be a non-negative number.');
            setLoading(false);
            return;
        }
        if (isNaN(payload.i_price) || payload.i_price < 0) {
            setError('Price must be a non-negative number.');
            setLoading(false);
            return;
        }


        const method = currentInventoryItem ? 'PUT' : 'POST';
        const url = '/api/inventory';
        let body: any = payload;

        if (method === 'PUT') {
            // For PUT request, we need the i_id
            if (!currentInventoryItem?.i_id) {
                setError('Inventory ID is missing for update operation.');
                setLoading(false);
                return;
            }
            body = { ...payload, i_id: currentInventoryItem.i_id };
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || `Failed to ${method === 'POST' ? 'add' : 'update'} inventory item`);
            }

            setIsModalOpen(false);
            setCurrentInventoryItem(null); // Clear current item after operation
            // Reset form state
            setFormState({ i_name: '', i_stock: '0', i_price: '0.00' });
            setCurrentPage(1); // Reset to first page to see changes
            fetchInventory(); // Re-fetch to get the latest data
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    // Delete Inventory Item Handler
    const handleDeleteInventory = async () => {
        if (!currentInventoryItem) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/inventory?i_id=${currentInventoryItem.i_id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to delete inventory item');
            }
            setIsDeleteModalOpen(false);
            setCurrentInventoryItem(null);
            // If the last item on a page is deleted, go to the previous page if applicable
            if (inventoryItems.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchInventory(); // Re-fetch to get the latest data
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Modal Control Functions
    const openAddModal = () => {
        setCurrentInventoryItem(null); // Ensure no item is selected for "add"
        setFormState({ i_name: '', i_stock: '0', i_price: '0.00' });
        setIsModalOpen(true);
    };

    const openEditModal = (item: InventoryItem) => {
        setCurrentInventoryItem(item);
        setFormState({
            i_id: item.i_id,
            i_name: item.i_name,
            i_stock: item.i_stock.toString(),
            i_price: item.i_price.toString(),
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (item: InventoryItem) => {
        setCurrentInventoryItem(item);
        setIsDeleteModalOpen(true);
    };


    return (
        <Card title={title}>
            {showAddButton && (
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
                >
                    Add New Inventory Item
                </button>
            )}

            {loading && <p className="text-center text-gray-600">Loading inventory items...</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {!loading && !error && inventoryItems.length === 0 && (
                <p className="text-center text-gray-600">No inventory items found.</p>
            )}

            {!loading && !error && inventoryItems.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead>
                                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                    <th className="py-2 px-4 border-b rounded-tl-lg">ID</th>
                                    <th className="py-2 px-4 border-b">Name</th>
                                    <th className="py-2 px-4 border-b">Stock</th>
                                    <th className="py-2 px-4 border-b">Price</th>
                                    {showActions && <th className="py-2 px-4 border-b text-center rounded-tr-lg">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {inventoryItems.map((item) => (
                                    <tr key={item.i_id} className="hover:bg-gray-50">
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{item.i_id}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{item.i_name}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{item.i_stock}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">Rp {item.i_price.toLocaleString('id-ID')}</td>
                                        {showActions && (
                                            <td className="py-2 px-4 border-b text-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="bg-yellow-500 text-white px-3 py-1 rounded-md text-xs hover:bg-yellow-600 transition-colors shadow"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(item)}
                                                    className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600 transition-colors shadow"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1 || loading}
                            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed shadow"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || loading}
                            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed shadow"
                        >
                            Next
                        </button>
                    </div>
                </>
            )}

            {/* Add/Edit Inventory Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {currentInventoryItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                        </h2>
                        <form onSubmit={handleAddEditSubmit}>
                            <div className="mb-4">
                                <label htmlFor="i_id" className="block text-gray-700 text-sm font-bold mb-2">Inventory ID:</label>
                                <input
                                    type="text"
                                    id="i_id"
                                    name="i_id"
                                    value={currentInventoryItem?.i_id || "Auto-generated by system"}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100 cursor-not-allowed"
                                    disabled={true} // ID is auto-generated for new, or non-editable for existing
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="i_name" className="block text-gray-700 text-sm font-bold mb-2">Item Name:</label>
                                <input
                                    type="text"
                                    id="i_name"
                                    name="i_name"
                                    value={formState.i_name}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="i_stock" className="block text-gray-700 text-sm font-bold mb-2">Stock:</label>
                                <input
                                    type="number"
                                    id="i_stock"
                                    name="i_stock"
                                    value={formState.i_stock}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label htmlFor="i_price" className="block text-gray-700 text-sm font-bold mb-2">Price (Rp):</label>
                                <input
                                    type="number"
                                    id="i_price"
                                    name="i_price"
                                    value={formState.i_price}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>

                            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

                            <div className="flex items-center justify-between">
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline shadow"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : currentInventoryItem ? 'Update Item' : 'Add Item'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline shadow"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && currentInventoryItem && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h2>
                        <p className="mb-6">
                            Are you sure you want to delete inventory item **{currentInventoryItem.i_name} (ID: {currentInventoryItem.i_id})**?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline shadow"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteInventory}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline shadow"
                                disabled={loading}
                            >
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default InventoryTable;
