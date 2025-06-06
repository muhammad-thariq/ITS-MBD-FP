// src/components/CustomerTable.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from './Card'; // Reusing your Card component

// Define interface for Customer
interface Customer {
    c_id: string;
    c_name: string;
    c_phone: string;
}

// Dedicated interface for the form state
interface CustomerFormState {
    c_id?: string; // Optional for add, required for edit
    c_name: string;
    c_phone: string;
}

interface CustomerTableProps {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    showAddButton?: boolean;
    showActions?: boolean;
    title?: string;
}

const CustomerTable: React.FC<CustomerTableProps> = ({
    orderBy = 'c_id',
    orderDirection = 'asc',
    showAddButton = true,
    showActions = true,
    title = "Customer Management",
}) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

    const [formState, setFormState] = useState<CustomerFormState>({
        c_name: '',
        c_phone: '',
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 5; // You can adjust this

    // Function to fetch customer data from the API
    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const params = new URLSearchParams();
            params.append('limit', itemsPerPage.toString());
            params.append('offset', offset.toString());
            params.append('orderBy', orderBy);
            params.append('orderDirection', orderDirection);

            const url = `/api/customers?${params.toString()}`;
            const res = await fetch(url);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch customers');
            }
            const { customers: fetchedCustomers, totalCount } = await res.json();
            setCustomers(fetchedCustomers);
            setTotalPages(Math.ceil(totalCount / itemsPerPage));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentPage, orderBy, orderDirection]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

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

        const method = currentCustomer ? 'PUT' : 'POST';
        const url = '/api/customers';
        let body: any = {
            c_name: formState.c_name,
            c_phone: formState.c_phone,
        };

        if (method === 'PUT') {
            // For PUT request, we need the c_id
            if (!currentCustomer?.c_id) {
                setError('Customer ID is missing for update operation.');
                setLoading(false);
                return;
            }
            body = { ...body, c_id: currentCustomer.c_id };
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || `Failed to ${method === 'POST' ? 'add' : 'update'} customer`);
            }

            setIsModalOpen(false);
            setCurrentCustomer(null); // Clear current item after operation
            setFormState({ c_name: '', c_phone: '' }); // Reset form state
            setCurrentPage(1); // Reset to first page to see changes
            fetchCustomers(); // Re-fetch to get the latest data
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    // Delete Customer Handler
    const handleDeleteCustomer = async () => {
        if (!currentCustomer) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/customers?c_id=${currentCustomer.c_id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to delete customer');
            }
            setIsDeleteModalOpen(false);
            setCurrentCustomer(null);
            // If the last item on a page is deleted, go to the previous page if applicable
            if (customers.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchCustomers(); // Re-fetch to get the latest data
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Modal Control Functions
    const openAddModal = () => {
        setCurrentCustomer(null); // Ensure no item is selected for "add"
        setFormState({ c_name: '', c_phone: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (customer: Customer) => {
        setCurrentCustomer(customer);
        setFormState({
            c_id: customer.c_id,
            c_name: customer.c_name,
            c_phone: customer.c_phone,
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (customer: Customer) => {
        setCurrentCustomer(customer);
        setIsDeleteModalOpen(true);
    };


    return (
        <Card title={title}>
            {showAddButton && (
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4 shadow"
                >
                    Add New Customer
                </button>
            )}

            {loading && <p className="text-center text-gray-600">Loading customers...</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {!loading && !error && customers.length === 0 && (
                <p className="text-center text-gray-600">No customers found.</p>
            )}

            {!loading && !error && customers.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead>
                                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                    <th className="py-2 px-4 border-b rounded-tl-lg">ID</th>
                                    <th className="py-2 px-4 border-b">Name</th>
                                    <th className="py-2 px-4 border-b">Phone</th>
                                    {showActions && <th className="py-2 px-4 border-b text-center rounded-tr-lg">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((customer) => (
                                    <tr key={customer.c_id} className="hover:bg-gray-50">
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{customer.c_id}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{customer.c_name}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{customer.c_phone}</td>
                                        {showActions && (
                                            <td className="py-2 px-4 border-b text-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(customer)}
                                                    className="bg-yellow-500 text-white px-3 py-1 rounded-md text-xs hover:bg-yellow-600 transition-colors shadow"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(customer)}
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

            {/* Add/Edit Customer Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {currentCustomer ? 'Edit Customer' : 'Add New Customer'}
                        </h2>
                        <form onSubmit={handleAddEditSubmit}>
                            <div className="mb-4">
                                <label htmlFor="c_id" className="block text-gray-700 text-sm font-bold mb-2">Customer ID:</label>
                                <input
                                    type="text"
                                    id="c_id"
                                    name="c_id"
                                    value={currentCustomer?.c_id || "Auto-generated by system"}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100 cursor-not-allowed"
                                    disabled={true} // ID is auto-generated for new, or non-editable for existing
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="c_name" className="block text-gray-700 text-sm font-bold mb-2">Customer Name:</label>
                                <input
                                    type="text"
                                    id="c_name"
                                    name="c_name"
                                    value={formState.c_name}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label htmlFor="c_phone" className="block text-gray-700 text-sm font-bold mb-2">Phone Number:</label>
                                <input
                                    type="text"
                                    id="c_phone"
                                    name="c_phone"
                                    value={formState.c_phone}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                                    {loading ? 'Saving...' : currentCustomer ? 'Update Customer' : 'Add Customer'}
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
            {isDeleteModalOpen && currentCustomer && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h2>
                        <p className="mb-6">
                            Are you sure you want to delete customer **{currentCustomer.c_name} (ID: {currentCustomer.c_id})**?
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
                                onClick={handleDeleteCustomer}
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

export default CustomerTable;
