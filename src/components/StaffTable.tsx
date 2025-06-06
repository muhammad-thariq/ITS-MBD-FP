// src/components/StaffTable.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from './Card'; // Reusing your Card component

// Define interface for Staff Member
interface StaffMember {
    s_id: string;
    s_name: string;
    s_phone: string;
    s_address: string | null; // Address can be null
    s_gender: 'M' | 'F' | 'O';
}

// Dedicated interface for the form state
interface StaffFormState {
    s_id?: string; // Optional for add, required for edit
    s_name: string;
    s_phone: string;
    s_address: string;
    s_gender: string; // Use string for input, convert to 'M' | 'F' | 'O' for API
}

interface StaffTableProps {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    showAddButton?: boolean;
    showActions?: boolean;
    title?: string;
}

const StaffTable: React.FC<StaffTableProps> = ({
    orderBy = 's_id',
    orderDirection = 'asc',
    showAddButton = true,
    showActions = true,
    title = "Staff Management",
}) => {
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentStaffMember, setCurrentStaffMember] = useState<StaffMember | null>(null);

    const [formState, setFormState] = useState<StaffFormState>({
        s_name: '',
        s_phone: '',
        s_address: '',
        s_gender: '',
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 5; // You can adjust this

    // Function to fetch staff data from the API
    const fetchStaffMembers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const params = new URLSearchParams();
            params.append('limit', itemsPerPage.toString());
            params.append('offset', offset.toString());
            params.append('orderBy', orderBy);
            params.append('orderDirection', orderDirection);

            const url = `/api/staff?${params.toString()}`;
            const res = await fetch(url);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch staff members');
            }
            const { staffMembers: fetchedStaff, totalCount } = await res.json();
            setStaffMembers(fetchedStaff);
            setTotalPages(Math.ceil(totalCount / itemsPerPage));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentPage, orderBy, orderDirection]);

    useEffect(() => {
        fetchStaffMembers();
    }, [fetchStaffMembers]);

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

        const method = currentStaffMember ? 'PUT' : 'POST';
        const url = '/api/staff';
        let body: StaffFormState = {
            s_name: formState.s_name,
            s_phone: formState.s_phone,
            s_address: formState.s_address,
            s_gender: formState.s_gender.toUpperCase(), // Ensure uppercase for DB
        };

        if (method === 'PUT') {
            // For PUT request, we need the s_id
            if (!currentStaffMember?.s_id) {
                setError('Staff ID is missing for update operation.');
                setLoading(false);
                return;
            }
            body = { ...body, s_id: currentStaffMember.s_id };
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || `Failed to ${method === 'POST' ? 'add' : 'update'} staff member`);
            }

            setIsModalOpen(false);
            setCurrentStaffMember(null); // Clear current item after operation
            setFormState({ s_name: '', s_phone: '', s_address: '', s_gender: '' }); // Reset form state
            setCurrentPage(1); // Reset to first page to see changes
            fetchStaffMembers(); // Re-fetch to get the latest data
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    // Delete Staff Member Handler
    const handleDeleteStaffMember = async () => {
        if (!currentStaffMember) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/staff?s_id=${currentStaffMember.s_id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to delete staff member');
            }
            setIsDeleteModalOpen(false);
            setCurrentStaffMember(null);
            // If the last item on a page is deleted, go to the previous page if applicable
            if (staffMembers.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchStaffMembers(); // Re-fetch to get the latest data
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Modal Control Functions
    const openAddModal = () => {
        setCurrentStaffMember(null); // Ensure no item is selected for "add"
        setFormState({ s_name: '', s_phone: '', s_address: '', s_gender: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (staff: StaffMember) => {
        setCurrentStaffMember(staff);
        setFormState({
            s_id: staff.s_id,
            s_name: staff.s_name,
            s_phone: staff.s_phone,
            s_address: staff.s_address || '', // Handle null address
            s_gender: staff.s_gender,
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (staff: StaffMember) => {
        setCurrentStaffMember(staff);
        setIsDeleteModalOpen(true);
    };


    return (
        <Card title={title}>
            {showAddButton && (
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4 shadow"
                >
                    Add New Staff Member
                </button>
            )}

            {loading && <p className="text-center text-gray-600">Loading staff members...</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {!loading && !error && staffMembers.length === 0 && (
                <p className="text-center text-gray-600">No staff members found.</p>
            )}

            {!loading && !error && staffMembers.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead>
                                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                    <th className="py-2 px-4 border-b rounded-tl-lg">ID</th>
                                    <th className="py-2 px-4 border-b">Name</th>
                                    <th className="py-2 px-4 border-b">Phone</th>
                                    <th className="py-2 px-4 border-b">Address</th>
                                    <th className="py-2 px-4 border-b">Gender</th>
                                    {showActions && <th className="py-2 px-4 border-b text-center rounded-tr-lg">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {staffMembers.map((staff) => (
                                    <tr key={staff.s_id} className="hover:bg-gray-50">
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{staff.s_id}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{staff.s_name}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{staff.s_phone}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{staff.s_address || 'N/A'}</td>
                                        <td className="py-2 px-4 border-b text-sm text-gray-800">{staff.s_gender}</td>
                                        {showActions && (
                                            <td className="py-2 px-4 border-b text-center space-x-2">
                                                <button
                                                    onClick={() => openEditModal(staff)}
                                                    className="bg-yellow-500 text-white px-3 py-1 rounded-md text-xs hover:bg-yellow-600 transition-colors shadow"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(staff)}
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

            {/* Add/Edit Staff Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {currentStaffMember ? 'Edit Staff Member' : 'Add New Staff Member'}
                        </h2>
                        <form onSubmit={handleAddEditSubmit}>
                            <div className="mb-4">
                                <label htmlFor="s_id" className="block text-gray-700 text-sm font-bold mb-2">Staff ID:</label>
                                <input
                                    type="text"
                                    id="s_id"
                                    name="s_id"
                                    value={currentStaffMember?.s_id || "Auto-generated by system"}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100 cursor-not-allowed"
                                    disabled={true} // ID is auto-generated for new, or non-editable for existing
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="s_name" className="block text-gray-700 text-sm font-bold mb-2">Staff Name:</label>
                                <input
                                    type="text"
                                    id="s_name"
                                    name="s_name"
                                    value={formState.s_name}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="s_phone" className="block text-gray-700 text-sm font-bold mb-2">Phone Number:</label>
                                <input
                                    type="text"
                                    id="s_phone"
                                    name="s_phone"
                                    value={formState.s_phone}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="s_address" className="block text-gray-700 text-sm font-bold mb-2">Address:</label>
                                <input
                                    type="text"
                                    id="s_address"
                                    name="s_address"
                                    value={formState.s_address}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                />
                            </div>
                            <div className="mb-6">
                                <label htmlFor="s_gender" className="block text-gray-700 text-sm font-bold mb-2">Gender:</label>
                                <select
                                    id="s_gender"
                                    name="s_gender"
                                    value={formState.s_gender}
                                    onChange={handleInputChange}
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="O">Other</option>
                                </select>
                            </div>

                            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

                            <div className="flex items-center justify-between">
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline shadow"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : currentStaffMember ? 'Update Staff' : 'Add Staff'}
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
            {isDeleteModalOpen && currentStaffMember && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h2>
                        <p className="mb-6">
                            Are you sure you want to delete staff member **{currentStaffMember.s_name} (ID: {currentStaffMember.s_id})**?
                            This action cannot be undone. If this staff member is linked to printers or transactions, deletion will fail.
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
                                onClick={handleDeleteStaffMember}
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

export default StaffTable;