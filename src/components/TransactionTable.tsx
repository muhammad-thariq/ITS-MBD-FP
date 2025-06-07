// src/components/TransactionTable.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from './Card'; // Reusing your Card component
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

import AddTransactionModal from './AddTransactionModal'; // NEW IMPORT: Add the modal here

// Define interfaces for Transaction and its nested data
interface TransactionItem {
    t_id: string;
    t_datetime: string;
    t_totalprice: number;
    t_paymentmethod: string;
    customer_c_id: string;
    customer: { c_name: string } | null; // Nested customer data
    staff_transact: { staff: { s_name: string; s_id: string } | null }[]; // Nested staff data
    printer_transaction: { printer_p_id: string }[]; // Nested printer data
    transaction_inventory: {
        inventory_i_id: string;
        quantity: number;
        inventory: { i_name: string; i_price: number } | null;
    }[];
}

// Dedicated interface for the form state (for PUT operations, limited fields)
interface TransactionFormState {
    t_id: string;
    customer_c_id: string;
    t_paymentmethod: string;
}

// Interface for Customer options in dropdown (for PUT modal)
interface CustomerOption {
    c_id: string;
    c_name: string;
}

// New Interface for the PUT API payload for transactions
interface TransactionUpdatePayload {
    t_id: string;
    customer_c_id: string;
    t_paymentmethod: string;
}

interface TransactionTableProps {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    showActions?: boolean;
    title?: string;
    showAddButton?: boolean; // This prop is now defined
}

const TransactionTable: React.FC<TransactionTableProps> = ({
    orderBy = 't_datetime',
    orderDirection = 'desc', // Default to latest transactions first
    showActions = true,
    title = "Transaction History",
    showAddButton = true, // Default to true now that it's moved
}) => {
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]); // For PUT modal
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false); // NEW STATE: For the Add Transaction modal
    const [currentTransaction, setCurrentTransaction] = useState<TransactionItem | null>(null);

    const [formState, setFormState] = useState<TransactionFormState>({
        t_id: '',
        customer_c_id: '',
        t_paymentmethod: '',
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 5; // You can adjust this

    // Function to fetch transaction data from the API
    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const params = new URLSearchParams();
            params.append('limit', itemsPerPage.toString());
            params.append('offset', offset.toString());
            params.append('orderBy', orderBy);
            params.append('orderDirection', orderDirection);

            const url = `/api/transactions?${params.toString()}`;
            const res = await fetch(url);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch transactions');
            }
            const { transactions: fetchedTransactions, totalCount } = await res.json();
            setTransactions(fetchedTransactions);
            setTotalPages(Math.ceil(totalCount / itemsPerPage));
        } catch (err: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'An unexpected error occurred while fetching transactions.';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [currentPage, orderBy, orderDirection]);

    // Function to fetch all customers for the dropdown in edit modal
    const fetchAllCustomers = useCallback(async () => {
        try {
            const res = await fetch('/api/customers?limit=9999'); // Fetch all customers
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch customer list');
            }
            const { customers: fetchedCustomers } = await res.json();
            setAllCustomers(fetchedCustomers);
        } catch (err: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'An unexpected error occurred while fetching all customers for transaction edit.';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            console.error("Error fetching all customers for transaction edit:", errorMessage);
            // No need to set global error here, as this is for a modal dropdown
        }
    }, []);


    useEffect(() => {
        fetchTransactions();
        fetchAllCustomers(); // Fetch customers when component mounts
    }, [fetchTransactions, fetchAllCustomers]);

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

    // Form Input Change Handler for Edit Modal
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Edit Submit Handler
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const url = '/api/transactions';
        const body: TransactionUpdatePayload = { // Explicitly type body
            t_id: formState.t_id,
            customer_c_id: formState.customer_c_id,
            t_paymentmethod: formState.t_paymentmethod,
        };

        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to update transaction');
            }

            setIsEditModalOpen(false);
            setCurrentTransaction(null); // Clear current item after operation
            fetchTransactions(); // Re-fetch to get the latest data
        } catch (err: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'An unexpected error occurred while updating the transaction.';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Delete Transaction Handler
    const handleDeleteTransaction = async () => {
        if (!currentTransaction) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/transactions?t_id=${currentTransaction.t_id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to delete transaction');
            }
            setIsDeleteModalOpen(false);
            setCurrentTransaction(null);
            // If the last item on a page is deleted, go to the previous page if applicable
            if (transactions.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchTransactions(); // Re-fetch to get the latest data
            }
        } catch (err: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'An unexpected error occurred while deleting the transaction.';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Modal Control Functions
    const openAddModal = () => { // NEW FUNCTION
        setIsAddModalOpen(true);
    };

    const handleTransactionAdded = (success: boolean) => { // NEW FUNCTION (moved from page.tsx)
        setIsAddModalOpen(false); // Close modal
        if (success) {
            fetchTransactions(); // Refresh transaction table data
        }
    };

    const openEditModal = (transaction: TransactionItem) => {
        setCurrentTransaction(transaction);
        setFormState({
            t_id: transaction.t_id,
            customer_c_id: transaction.customer_c_id,
            t_paymentmethod: transaction.t_paymentmethod,
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (transaction: TransactionItem) => {
        setCurrentTransaction(transaction);
        setIsDeleteModalOpen(true);
    };

    return (
        <Card title={title}>
            {showAddButton && (
                <button
                    onClick={openAddModal} // Use the new openAddModal function
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4 shadow"
                >
                    Add New Transaction
                </button>
            )}

            {loading && <p className="text-center text-gray-600">Loading transactions...</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {!loading && !error && transactions.length === 0 && (
                <p className="text-center text-gray-600">No transactions found.</p>
            )}

            {!loading && !error && transactions.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead>
                                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                    <th className="py-2 px-4 border-b rounded-tl-lg">ID</th>
                                    <th className="py-2 px-4 border-b">Date & Time</th>
                                    <th className="py-2 px-4 border-b">Customer</th>
                                    <th className="py-2 px-4 border-b">Staff</th>
                                    <th className="py-2 px-4 border-b">Printer (if any)</th>
                                    <th className="py-2 px-4 border-b">Items Purchased</th>
                                    <th className="py-2 px-4 border-b">Total Price</th>
                                    <th className="py-2 px-4 border-b">Payment Method</th>
                                    {showActions && <th className="py-2 px-4 border-b text-center rounded-tr-lg">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((transaction) => (
                                    <tr key={transaction.t_id} className="hover:bg-gray-50">
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{transaction.t_id}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                                            {dayjs(transaction.t_datetime).format('MMM D, YYYY h:mm A')}
                                        </td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                                            {transaction.customer?.c_name || transaction.customer_c_id}
                                        </td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                                            {transaction.staff_transact && transaction.staff_transact.length > 0
                                                ? transaction.staff_transact.map(st => st.staff?.s_name).filter(Boolean).join(', ')
                                                : 'N/A'}
                                        </td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                                            {transaction.printer_transaction && transaction.printer_transaction.length > 0
                                                ? transaction.printer_transaction.map(pt => pt.printer_p_id).join(', ')
                                                : 'N/A'}
                                        </td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                                            {transaction.transaction_inventory && transaction.transaction_inventory.length > 0
                                                ? transaction.transaction_inventory.map(ti => `${ti.quantity}x ${ti.inventory?.i_name || ti.inventory_i_id}`).join(', ')
                                                : 'N/A'}
                                        </td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                                            Rp {transaction.t_totalprice.toLocaleString('id-ID')}
                                        </td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">
                                            {transaction.t_paymentmethod}
                                        </td>
                                        {showActions && (
                                            <td className="py-2 px-4 border-b text-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(transaction)}
                                                    className="bg-yellow-500 text-white px-3 py-1 rounded-md text-xs hover:bg-yellow-600 transition-colors shadow"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(transaction)}
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

            {/* Add Transaction Modal - now managed by TransactionTable */}
            <AddTransactionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onTransactionAdded={handleTransactionAdded} // This will trigger a refresh of the transaction table
            />

            {/* Edit Transaction Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Transaction (ID: {formState.t_id})</h2>
                        <form onSubmit={handleEditSubmit}>
                            <div className="mb-4">
                                <label htmlFor="customer_c_id" className="block text-gray-700 text-sm font-bold mb-2">Customer:</label>
                                <select
                                    id="customer_c_id"
                                    name="customer_c_id"
                                    value={formState.customer_c_id}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                >
                                    <option value="">Select Customer</option>
                                    {allCustomers.map(customer => (
                                        <option key={customer.c_id} value={customer.c_id}>
                                            {customer.c_name} (ID: {customer.c_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="t_paymentmethod" className="block text-gray-700 text-sm font-bold mb-2">Payment Method:</label>
                                <input
                                    type="text"
                                    id="t_paymentmethod"
                                    name="t_paymentmethod"
                                    value={formState.t_paymentmethod}
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
                                    {loading ? 'Saving...' : 'Update Transaction'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
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
            {isDeleteModalOpen && currentTransaction && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h2>
                        <p className="mb-6">
                            Are you sure you want to delete transaction **{currentTransaction.t_id}**?
                            <br />
                            <span className="font-semibold text-red-700">This will restore associated inventory stock.</span>
                            <br />
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
                                onClick={handleDeleteTransaction}
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

export default TransactionTable;