// src/components/MembershipTable.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from './Card'; // Reusing your Card component
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

// Define interface for Membership
interface Membership {
    m_id: number; // m_id is INT
    m_datecreated: string; // ISO string
    m_dateexpired: string; // ISO string (or just date string if DB is date)
    customer_c_id: string;
    m_points: number;
    customer?: { // Optional nested customer object from join
        c_name: string;
    };
}

// Interface for Customer options in dropdown
interface CustomerOption {
    c_id: string;
    c_name: string;
}

// Dedicated interface for the form state (inputs are strings)
interface MembershipFormState {
    m_id?: number; // Optional for add, required for edit
    customer_c_id: string;
    m_dateexpired: string; // YYYY-MM-DD format for date input
    m_points: string; // !!! Still string for input field
}

// NEW INTERFACE: For the data sent to the API (m_points is a number here)
interface MembershipApiPayload {
    m_id?: number; // Optional for POST, required for PUT
    customer_c_id: string;
    m_dateexpired: string;
    m_points: number; // !!! Number for API payload
}

interface MembershipTableProps {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    showAddButton?: boolean;
    showActions?: boolean;
    title?: string;
}

const MembershipTable: React.FC<MembershipTableProps> = ({
    orderBy = 'm_id',
    orderDirection = 'asc',
    showAddButton = true,
    showActions = true,
    title = "Membership Management",
}) => {
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentMembership, setCurrentMembership] = useState<Membership | null>(null);

    const [formState, setFormState] = useState<MembershipFormState>({
        customer_c_id: '',
        m_dateexpired: '',
        m_points: '0',
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 5; // You can adjust this

    // Function to fetch membership data from the API
    const fetchMemberships = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const params = new URLSearchParams();
            params.append('limit', itemsPerPage.toString());
            params.append('offset', offset.toString());
            params.append('orderBy', orderBy);
            params.append('orderDirection', orderDirection);

            const url = `/api/membership?${params.toString()}`;
            const res = await fetch(url);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch memberships');
            }
            const { memberships: fetchedMemberships, totalCount } = await res.json();
            setMemberships(fetchedMemberships);
            setTotalPages(Math.ceil(totalCount / itemsPerPage));
        } catch (err: unknown) {
            let errorMessage = 'An unexpected error occurred while fetching memberships.';
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

    // Function to fetch all customers for the dropdown
    const fetchAllCustomers = useCallback(async () => {
        try {
            // Fetch customers from the existing API, ensuring no limit/offset is applied for dropdown
            const res = await fetch('/api/customers?limit=9999'); // Fetch all customers
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch customer list');
            }
            const { customers: fetchedCustomers } = await res.json();
            setAllCustomers(fetchedCustomers);
        } catch (err: unknown) {
            let errorMessage = 'An unexpected error occurred while fetching customer list.';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            console.error("Error fetching all customers:", errorMessage);
            setError(errorMessage); // This might block the modal if not handled gracefully
        }
    }, []);


    useEffect(() => {
        fetchMemberships();
        fetchAllCustomers(); // Fetch customers when component mounts
    }, [fetchMemberships, fetchAllCustomers]);

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
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

        // Convert string inputs to numbers for API payload
        const payload: MembershipApiPayload = {
            customer_c_id: formState.customer_c_id,
            m_dateexpired: formState.m_dateexpired,
            m_points: parseInt(formState.m_points, 10), // Now correctly typed as number in payload
        };

        // Basic validation for points
        if (isNaN(payload.m_points) || payload.m_points < 0) {
            setError('Points must be a non-negative number.');
            setLoading(false);
            return;
        }

        const method = currentMembership ? 'PUT' : 'POST';
        const url = '/api/membership';
        let body: MembershipApiPayload; // Use the new API Payload type

        if (method === 'PUT') {
            // For PUT request, we need the m_id
            if (currentMembership?.m_id === undefined) {
                setError('Membership ID is missing for update operation.');
                setLoading(false);
                return;
            }
            body = { ...payload, m_id: currentMembership.m_id };
        } else {
            // For POST, m_id is auto-generated by the backend
            body = payload;
        }


        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.details || errData.message || `Failed to ${method === 'POST' ? 'add' : 'update'} membership`);
            }

            setIsModalOpen(false);
            setCurrentMembership(null); // Clear current item after operation
            // Reset form state
            setFormState({ customer_c_id: '', m_dateexpired: '', m_points: '0' });
            setCurrentPage(1); // Reset to first page to see changes
            fetchMemberships(); // Re-fetch to get the latest data
        } catch (err: unknown) {
            let errorMessage = `An unexpected error occurred while trying to ${method === 'POST' ? 'add' : 'update'} the membership.`;
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            setError(errorMessage);
            setLoading(false);
        }
    };

    // Delete Membership Handler
    const handleDeleteMembership = async () => {
        if (!currentMembership) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/membership?m_id=${currentMembership.m_id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to delete membership');
            }
            setIsDeleteModalOpen(false);
            setCurrentMembership(null);
            // If the last item on a page is deleted, go to the previous page if applicable
            if (memberships.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchMemberships(); // Re-fetch to get the latest data
            }
        } catch (err: unknown) {
            let errorMessage = 'An unexpected error occurred while deleting the membership.';
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
    const openAddModal = () => {
        setCurrentMembership(null); // Ensure no item is selected for "add"
        setFormState({ customer_c_id: '', m_dateexpired: '', m_points: '0' });
        setIsModalOpen(true);
    };

    const openEditModal = (membership: Membership) => {
        setCurrentMembership(membership);
        setFormState({
            m_id: membership.m_id,
            customer_c_id: membership.customer_c_id,
            m_dateexpired: dayjs(membership.m_dateexpired).format('YYYY-MM-DD'), // Format for date input
            m_points: membership.m_points.toString(), // Convert number to string for form input
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (membership: Membership) => {
        setCurrentMembership(membership);
        setIsDeleteModalOpen(true);
    };


    return (
        <Card title={title}>
            {showAddButton && (
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4 shadow"
                >
                    Add New Membership
                </button>
            )}

            {loading && <p className="text-center text-gray-600">Loading memberships...</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {!loading && !error && memberships.length === 0 && (
                <p className="text-center text-gray-600">No memberships found.</p>
            )}

            {!loading && !error && memberships.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead>
                                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                    <th className="py-2 px-4 border-b rounded-tl-lg">ID</th>
                                    <th className="py-2 px-4 border-b">Customer ID</th>
                                    <th className="py-2 px-4 border-b">Customer Name</th>
                                    <th className="py-2 px-4 border-b">Created Date</th>
                                    <th className="py-2 px-4 border-b">Expiry Date</th>
                                    <th className="py-2 px-4 border-b">Points</th>
                                    {showActions && <th className="py-2 px-4 border-b text-center rounded-tr-lg">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {memberships.map((membership) => (
                                    <tr key={membership.m_id} className="hover:bg-gray-50">
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{membership.m_id}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{membership.customer_c_id}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{membership.customer?.c_name || 'N/A'}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{dayjs(membership.m_datecreated).format('L')}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{dayjs(membership.m_dateexpired).format('L')}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{membership.m_points}</td>
                                        {showActions && (
                                            <td className="py-2 px-4 border-b text-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(membership)}
                                                    className="bg-yellow-500 text-white px-3 py-1 rounded-md text-xs hover:bg-yellow-600 transition-colors shadow"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(membership)}
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

            {/* Add/Edit Membership Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {currentMembership ? 'Edit Membership' : 'Add New Membership'}
                        </h2>
                        <form onSubmit={handleAddEditSubmit}>
                            {/* Customer ID (Dropdown) - Only editable for new membership */}
                            <div className="mb-4">
                                <label htmlFor="customer_c_id" className="block text-gray-700 text-sm font-bold mb-2">Customer:</label>
                                <select
                                    id="customer_c_id"
                                    name="customer_c_id"
                                    value={formState.customer_c_id}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                    disabled={!!currentMembership} // Disable if editing existing membership
                                >
                                    <option value="">Select Customer</option>
                                    {allCustomers.map(customer => (
                                        <option key={customer.c_id} value={customer.c_id}>
                                            {customer.c_name} (ID: {customer.c_id})
                                        </option>
                                    ))}
                                </select>
                                {!!currentMembership && (
                                    <p className="text-xs text-gray-500 mt-1">Customer cannot be changed for an existing membership.</p>
                                )}
                            </div>

                            {/* Expiry Date */}
                            <div className="mb-4">
                                <label htmlFor="m_dateexpired" className="block text-gray-700 text-sm font-bold mb-2">Expiry Date:</label>
                                <input
                                    type="date"
                                    id="m_dateexpired"
                                    name="m_dateexpired"
                                    value={formState.m_dateexpired}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>

                            {/* Points */}
                            <div className="mb-6">
                                <label htmlFor="m_points" className="block text-gray-700 text-sm font-bold mb-2">Points:</label>
                                <input
                                    type="number"
                                    id="m_points"
                                    name="m_points"
                                    value={formState.m_points}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                                    {loading ? 'Saving...' : currentMembership ? 'Update Membership' : 'Add Membership'}
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
            {isDeleteModalOpen && currentMembership && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h2>
                        <p className="mb-6">
                            Are you sure you want to delete membership **ID: {currentMembership.m_id}**
                            for customer **{currentMembership.customer?.c_name || currentMembership.customer_c_id}**?
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
                                onClick={handleDeleteMembership}
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

export default MembershipTable;