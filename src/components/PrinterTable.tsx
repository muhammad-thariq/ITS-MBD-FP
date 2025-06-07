// src/components/PrinterTable.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from './Card';
import Link from 'next/link';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat'; // Import customParseFormat for parsing specific date strings
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat); // Extend dayjs with customParseFormat

// Define interfaces for nested data
interface StaffInfo {
    s_id: string;
    s_name: string;
}

interface MaintenanceRecord {
    ma_dateti: string;
    ma_brand: string;
    ma_price: number;
    ma_notes: string;
}

interface Printer {
    p_id: string;
    p_status: boolean;
    p_condition: string;
    // Changed maintenance to be potentially null, matching potential Supabase behavior
    maintenance: MaintenanceRecord[] | null;
    staff_printer: { staff: StaffInfo | null }[];
}

// Dedicated interface for the form state
// Now includes staff assignment and latest maintenance fields
interface PrinterFormState {
    p_id?: string;
    p_condition: string;
    p_status_str: 'operational' | 'maintenance';
    selectedStaffIds: string[]; // For staff assignment checkboxes
    latestMaintenance: { // For editing/adding the latest maintenance record
        ma_dateti: string; // Will be displayed as a date string (YYYY-MM-DD)
        ma_brand: string;
        ma_price: string; // Use string for input, convert to number for API
        ma_notes: string;
    } | null;
    originalMaintenanceDateti: string | null; // To store the original date for comparison
    isNewMaintenance: boolean; // Flag to track if we're creating a new one or updating existing
}

// NEW INTERFACES for API Payloads
interface PrinterApiPayload {
    p_id?: string; // Optional for POST, required for PUT
    p_condition: string;
    p_status: boolean;
}

interface MaintenanceApiPayload {
    ma_dateti: string;
    ma_brand: string;
    ma_price: number;
    ma_notes: string;
    printer_p_id: string;
}

interface StaffPrinterApiPayload {
    staffIds: string[];
}

interface PrinterTableProps {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    showAddButton?: boolean;
    showActions?: boolean;
    title?: string;
    showViewAllLink?: boolean;
}

const PrinterTable: React.FC<PrinterTableProps> = ({
    orderBy = 'p_id',
    orderDirection = 'asc',
    showAddButton = true,
    showActions = true,
    title = "Printer List",
    showViewAllLink = false,
}) => {
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentPrinter, setCurrentPrinter] = useState<Printer | null>(null);

    const [allStaff, setAllStaff] = useState<StaffInfo[]>([]); // New state to fetch all staff for the modal

    const [formState, setFormState] = useState<PrinterFormState>({
        p_condition: '',
        p_status_str: 'operational',
        selectedStaffIds: [],
        latestMaintenance: null,
        originalMaintenanceDateti: null, // Initialize original date
        isNewMaintenance: false,
    });

    // Fetches all staff when the component mounts or modal is opened (more efficient here)
    const fetchAllStaff = useCallback(async () => {
        try {
            // It's generally a good idea to fetch all staff without pagination for a dropdown/checkbox list
            // Using a very large limit to ensure all are fetched.
            const res = await fetch('/api/staff?limit=9999');
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch all staff');
            }
            // MODIFICATION: Correctly access the 'staffMembers' property from the API response
            const { staffMembers }: { staffMembers: StaffInfo[] } = await res.json();
            setAllStaff(staffMembers);
        } catch (err: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'An unexpected error occurred while fetching all staff.';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            console.error("Failed to fetch all staff:", errorMessage);
            setError(errorMessage); // This error might block the entire form if not handled gracefully
        }
    }, []);


    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 5;

    const fetchPrinters = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const params = new URLSearchParams();
            params.append('limit', itemsPerPage.toString());
            params.append('offset', offset.toString());
            if (orderBy) params.append('orderBy', orderBy);
            if (orderDirection) params.append('orderDirection', orderDirection);

            const url = `/api/printers?${params.toString()}`;
            const res = await fetch(url);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to fetch printers');
            }
            const { printers: fetchedPrinters, totalCount } = await res.json();
            setPrinters(fetchedPrinters);
            setTotalPages(Math.ceil(totalCount / itemsPerPage));
        } catch (err: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'An unexpected error occurred while fetching printers.';
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

    useEffect(() => {
        fetchPrinters();
        fetchAllStaff(); // Fetch all staff once on component mount
    }, [fetchPrinters, fetchAllStaff]);

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

    // --- Form Input Change Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { // Added HTMLSelectElement
        const { name, value } = e.target;
        setFormState(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleMaintenanceInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({
            ...prev,
            latestMaintenance: {
                ...prev.latestMaintenance!, // Asserting it's not null, or handle initial null
                [name]: value
            }
        }));
    };

    const handleStaffCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const staffId = event.target.value;
        if (event.target.checked) {
            setFormState(prev => ({
                ...prev,
                selectedStaffIds: [...prev.selectedStaffIds, staffId]
            }));
        } else {
            setFormState(prev => ({
                ...prev,
                selectedStaffIds: prev.selectedStaffIds.filter(id => id !== staffId)
            }));
        }
    };

    // --- Add/Edit Submit Handler ---
    const handleAddEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const method = formState.p_id ? 'PUT' : 'POST';
        const printerUrl = '/api/printers';
        const maintenanceUrl = '/api/maintenance';
        // Assuming you'll create this API route for staff assignment if it doesn't exist yet
        const staffPrinterUrl = (printerId: string) => `/api/printers/${printerId}/staff`;


        const p_status_boolean = formState.p_status_str === 'operational';

        try {
            let currentPrinterId = formState.p_id;

            // 1. Handle Printer Basic Info (POST/PUT /api/printers)
            if (method === 'POST') {
                const printerPayload: PrinterApiPayload = { p_condition: formState.p_condition, p_status: p_status_boolean };
                const newPrinterRes = await fetch(printerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(printerPayload)
                });
                if (!newPrinterRes.ok) {
                    const errData = await newPrinterRes.json();
                    throw new Error(errData.message || 'Failed to add printer');
                }
                const newPrinterData = await newPrinterRes.json();
                currentPrinterId = newPrinterData.p_id; // Get the newly created ID
            } else { // method === 'PUT'
                const printerPayload: PrinterApiPayload = { p_id: formState.p_id, p_condition: formState.p_condition, p_status: p_status_boolean };
                const updatePrinterRes = await fetch(printerUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(printerPayload)
                });
                if (!updatePrinterRes.ok) {
                    const errData = await updatePrinterRes.json();
                    throw new Error(errData.message || 'Failed to update printer');
                }
            }

            if (!currentPrinterId) { // Should not happen if previous steps succeed
                throw new Error("Failed to get printer ID for subsequent operations.");
            }

            // 2. Handle Staff Assignments (PUT /api/printers/[p_id]/staff)
            const staffAssignmentPayload: StaffPrinterApiPayload = { staffIds: formState.selectedStaffIds };
            const staffAssignmentRes = await fetch(staffPrinterUrl(currentPrinterId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(staffAssignmentPayload)
            });
            if (!staffAssignmentRes.ok) {
                const errData = await staffAssignmentRes.json();
                console.error('Failed to update staff assignments:', errData); // Log the full error data
                throw new Error(errData.message || 'Failed to update staff assignments', { cause: errData.details });
            }


            // 3. Handle Latest Maintenance Record (POST/PUT/DELETE /api/maintenance)
            const maintenanceData = formState.latestMaintenance;
            // Check if all relevant maintenance fields are empty/null
            const isMaintenanceFormEmpty = !maintenanceData || (!maintenanceData.ma_brand && !maintenanceData.ma_notes && !maintenanceData.ma_price && !maintenanceData.ma_dateti);

            // Safely access currentPrinter.maintenance using optional chaining
            if (isMaintenanceFormEmpty && currentPrinter?.maintenance && currentPrinter.maintenance.length > 0) {
                // If form is empty but there was existing maintenance, try to delete the latest
                const latestExistingMaint = currentPrinter.maintenance.sort((a, b) => dayjs(b.ma_dateti).valueOf() - dayjs(a.ma_dateti).valueOf())[0];
                if (latestExistingMaint) {
                    const deleteMaintRes = await fetch(`${maintenanceUrl}?ma_dateti=${encodeURIComponent(latestExistingMaint.ma_dateti)}&printer_p_id=${currentPrinterId}`, {
                        method: 'DELETE',
                    });
                    if (!deleteMaintRes.ok) {
                        const errData = await deleteMaintRes.json();
                        // Log but don't block, as primary printer update is done
                        console.error('Failed to delete old maintenance:', errData.message);
                    }
                }
            } else if (!isMaintenanceFormEmpty && maintenanceData) {
                const formattedPrice = parseFloat(maintenanceData.ma_price);
                if (isNaN(formattedPrice) || formattedPrice < 0) {
                    throw new Error("Invalid maintenance price. Please enter a valid number.");
                }

                // If date input is empty for a NEW maintenance, use current date
                const newDate = maintenanceData.ma_dateti || dayjs().format('YYYY-MM-DD');

                // Check if the date has changed for an existing record
                const originalDate = formState.originalMaintenanceDateti;
                const isDateChanged = originalDate && dayjs(originalDate).format('YYYY-MM-DD') !== dayjs(newDate).format('YYYY-MM-DD');

                const maintPayload: MaintenanceApiPayload = {
                    ma_dateti: dayjs(newDate).toISOString(), // Use provided date for new record, or current if empty
                    ma_brand: maintenanceData.ma_brand,
                    ma_price: formattedPrice,
                    ma_notes: maintenanceData.ma_notes,
                    printer_p_id: currentPrinterId,
                };

                if (formState.isNewMaintenance) {
                    // Always create new if it's a new record
                    const createMaintRes = await fetch(maintenanceUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(maintPayload)
                    });
                    if (!createMaintRes.ok) {
                        const errData = await createMaintRes.json();
                        throw new Error(errData.message || 'Failed to create new maintenance record');
                    }
                } else if (isDateChanged) {
                    // If date changed for an existing record, delete old and create new
                    if (!originalDate) {
                        throw new Error("Original maintenance date missing for update with date change.");
                    }

                    // Delete old record
                    const deleteOldMaintRes = await fetch(`${maintenanceUrl}?ma_dateti=${encodeURIComponent(originalDate)}&printer_p_id=${currentPrinterId}`, {
                        method: 'DELETE',
                    });
                    if (!deleteOldMaintRes.ok) {
                        const errData = await deleteOldMaintRes.json();
                        throw new Error(errData.message || 'Failed to delete original maintenance record for date change');
                    }

                    // Create new record with new date
                    const createNewMaintRes = await fetch(maintenanceUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(maintPayload)
                    });
                    if (!createNewMaintRes.ok) {
                        const errData = await createNewMaintRes.json();
                        throw new Error(errData.message || 'Failed to create new maintenance record after date change');
                    }
                } else {
                    // Simple PUT update for existing record if date hasn't changed
                    // Note: ma_dateti and printer_p_id are composite primary keys for maintenance
                    const updateMaintRes = await fetch(maintenanceUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ma_dateti: originalDate, // Use the original date for PUT
                            ma_brand: maintenanceData.ma_brand,
                            ma_price: formattedPrice,
                            ma_notes: maintenanceData.ma_notes,
                            printer_p_id: currentPrinterId,
                        })
                    });
                    if (!updateMaintRes.ok) {
                        const errData = await updateMaintRes.json();
                        throw new Error(errData.message || 'Failed to update maintenance record');
                    }
                }
            }


            // All operations successful
            setIsModalOpen(false);
            setCurrentPrinter(null);
            // Reset form state including all new fields
            setFormState({
                p_condition: '',
                p_status_str: 'operational',
                selectedStaffIds: [],
                latestMaintenance: null,
                originalMaintenanceDateti: null, // Reset original date
                isNewMaintenance: false,
            });
            setCurrentPage(1); // Reset to first page
            fetchPrinters(); // Re-fetch to get the latest data
        } catch (err: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'An unexpected error occurred during printer operation.';
            // Check if the error has a 'cause' (for detailed API errors)
            if (err instanceof Error) {
                if (err.cause) {
                    errorMessage = `${err.message}: ${String(err.cause)}`; // Safely convert cause to string
                } else {
                    errorMessage = err.message;
                }
            } else if (typeof err === 'string') {
                errorMessage = err;
            } else {
                // Fallback for truly unknown error types
                errorMessage = 'An unknown error occurred.';
            }
            setError(errorMessage);
            setLoading(false); // Ensure loading state is reset on error
        }
    };

    // --- Delete Printer Handler ---
    const handleDeletePrinter = async () => {
        if (!currentPrinter) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/printers?p_id=${currentPrinter.p_id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to delete printer');
            }
            setIsDeleteModalOpen(false);
            setCurrentPrinter(null);
            if (printers.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchPrinters();
            }
        } catch (err: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'An unexpected error occurred while deleting the printer.';
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


    // --- Modal Control Functions ---
    const openAddModal = () => {
        setCurrentPrinter(null);
        setFormState({
            p_condition: '',
            p_status_str: 'operational',
            selectedStaffIds: [],
            latestMaintenance: { // Initialize with empty values for a new record
                ma_dateti: '',
                ma_brand: '',
                ma_price: '',
                ma_notes: ''
            },
            originalMaintenanceDateti: null, // No original date for new record
            isNewMaintenance: true, // New printer, so any maintenance added is new
        });
        setIsModalOpen(true);
    };

    const openEditModal = (printer: Printer) => {
        setCurrentPrinter(printer);

        let latestMaint: MaintenanceRecord | null = null;
        // Explicitly check if printer.maintenance exists and has elements
        if (printer.maintenance && printer.maintenance.length > 0) {
            latestMaint = printer.maintenance.sort((a, b) => dayjs(b.ma_dateti).valueOf() - dayjs(a.ma_dateti).valueOf())[0];
        }

        setFormState({
            p_id: printer.p_id,
            p_condition: printer.p_condition,
            p_status_str: printer.p_status ? 'operational' : 'maintenance',
            // Map staff_printer assignments to selectedStaffIds.
            // Filter out any potential nulls if staff object is not fully populated.
            selectedStaffIds: printer.staff_printer
                .map(sp => sp.staff?.s_id)
                .filter((sId): sId is string => !!sId),
            latestMaintenance: latestMaint ? {
                ma_dateti: dayjs(latestMaint.ma_dateti).format('YYYY-MM-DD'), // Format date for input type="date"
                ma_brand: latestMaint.ma_brand,
                ma_price: latestMaint.ma_price.toString(), // Convert number to string for input
                ma_notes: latestMaint.ma_notes,
            } : {
                // If no existing latest maintenance, initialize with empty values for form
                ma_dateti: '', ma_brand: '', ma_price: '', ma_notes: ''
            },
            originalMaintenanceDateti: latestMaint ? latestMaint.ma_dateti : null, // Store original full ISO string
            isNewMaintenance: !latestMaint, // If no latestMaint, then any update is 'new'
        });
        setIsModalOpen(true);
    };


    const openDeleteModal = (printer: Printer) => {
        setCurrentPrinter(printer);
        setIsDeleteModalOpen(true);
    };


    return (
        <Card title={title}>
            {showAddButton && (
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mb-4"
                >
                    Add New Printer
                </button>
            )}

            {loading && <p className="text-center text-gray-600">Loading printers...</p>}
            {error && <p className="text-center text-red-600">Error: {error}</p>}

            {!loading && !error && printers.length === 0 && (
                <p className="text-center text-gray-600">No printers found.</p>
            )}

            {!loading && !error && printers.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200">
                            <thead>
                                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                    <th className="py-2 px-4 border-b">ID</th>
                                    <th className="py-2 px-4 border-b">Condition</th>
                                    <th className="py-2 px-4 border-b">Status</th>
                                    <th className="py-2 px-4 border-b">Assigned Staff</th>
                                    <th className="py-2 px-4 border-b">Last Maint. Date</th>
                                    <th className="py-2 px-4 border-b">Last Maint. Brand</th>
                                    <th className="py-2 px-4 border-b">Last Maint. Price</th>
                                    <th className="py-2 px-4 border-b">Last Maint. Notes</th>
                                    {showActions && <th className="py-2 px-4 border-b text-center">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {printers.map((printer) => {
                                    let latestMaintenance: MaintenanceRecord | null = null;
                                    // Explicitly check if printer.maintenance exists and has elements
                                    if (printer.maintenance && printer.maintenance.length > 0) {
                                        latestMaintenance = printer.maintenance.sort((a, b) => dayjs(b.ma_dateti).valueOf() - dayjs(a.ma_dateti).valueOf())[0];
                                    }

                                    return (
                                        <tr key={printer.p_id} className="hover:bg-gray-50">
                                            <td className="py-2 px-4 border-b text-sm text-gray-800">{printer.p_id}</td>
                                            <td className="py-2 px-4 border-b text-sm text-gray-800">{printer.p_condition}</td>
                                            <td className="py-2 px-4 border-b text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    printer.p_status
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {printer.p_status ? 'Operational' : 'In Maintenance'}
                                                </span>
                                            </td>
                                            {/* Display Assigned Staff */}
                                            <td className="py-2 px-4 border-b text-sm text-gray-800">
                                                {printer.staff_printer && printer.staff_printer.length > 0
                                                    ? printer.staff_printer
                                                        .map(sp => sp.staff?.s_id)
                                                        .filter((sId): sId is string => !!sId)
                                                        // Corrected: Ensure allStaff is an array before using find
                                                        .map(sId => (allStaff.find(staff => staff.s_id === sId)?.s_name || sId))
                                                        .join(', ')
                                                    : 'N/A'}
                                            </td>
                                            {/* Maintenance details */}
                                            <td className="py-2 px-4 border-b text-sm text-gray-800">
                                                {latestMaintenance ? dayjs(latestMaintenance.ma_dateti).format('L') : 'N/A'}
                                            </td>
                                            <td className="py-2 px-4 border-b text-sm text-gray-800">
                                                {latestMaintenance ? latestMaintenance.ma_brand : 'N/A'}
                                            </td>
                                            <td className="py-2 px-4 border-b text-sm text-gray-800">
                                                {latestMaintenance ? `Rp ${latestMaintenance.ma_price.toLocaleString('id-ID')}` : 'N/A'}
                                            </td>
                                            <td className="py-2 px-4 border-b text-sm text-gray-800">
                                                {latestMaintenance ? latestMaintenance.ma_notes : 'N/A'}
                                            </td>
                                            {showActions && (
                                                <td className="py-2 px-4 border-b text-center space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(printer)}
                                                        className="bg-yellow-500 text-white px-3 py-1 rounded-md text-xs hover:bg-yellow-600 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(printer)}
                                                        className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1 || loading}
                            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || loading}
                            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </>
            )}

            {/* View All Printers Link */}
            {showViewAllLink && (
                <div className="text-right mt-4">
                    <Link href="/printers" passHref>
                        <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                            View All Printers (Full Management)
                        </button>
                    </Link>
                </div>
            )}

            {/* Add/Edit Printer Modal - UPDATED TO INCLUDE STAFF AND MAINTENANCE */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl overflow-y-auto max-h-[90vh]"> {/* Increased max-w, added overflow */}
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {formState.p_id ? 'Edit Printer' : 'Add New Printer'}
                        </h2>
                        <form onSubmit={handleAddEditSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {/* Basic Printer Info */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Printer Details</h3>
                                    <div className="mb-4">
                                        <label htmlFor="p_id" className="block text-gray-700 text-sm font-bold mb-2">Printer ID:</label>
                                        <input type="text" id="p_id" name="p_id" value={formState.p_id || "Auto-generated by system"} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100 cursor-not-allowed" required disabled={true} />
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="p_condition" className="block text-gray-700 text-sm font-bold mb-2">Condition:</label>
                                        <input type="text" id="p_condition" name="p_condition" value={formState.p_condition} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required />
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">Status:</label>
                                        <div className="flex items-center space-x-4">
                                            <label className="inline-flex items-center">
                                                <input type="radio" name="p_status_str" value="operational" checked={formState.p_status_str === 'operational'} onChange={handleInputChange} className="form-radio h-4 w-4 text-green-600" />
                                                <span className="ml-2 text-gray-700">Operational</span>
                                            </label>
                                            <label className="inline-flex items-center">
                                                <input type="radio" name="p_status_str" value="maintenance" checked={formState.p_status_str === 'maintenance'} onChange={handleInputChange} className="form-radio h-4 w-4 text-orange-600" />
                                                <span className="ml-2 text-gray-700">In Maintenance</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned Staff Section */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Assigned Staff</h3>
                                    {allStaff.length === 0 ? (
                                        <p className="text-gray-600 text-sm">No staff available.</p>
                                    ) : (
                                        <div className="mb-6 h-48 overflow-y-auto border p-3 rounded">
                                            {allStaff.map(staff => (
                                                <div key={staff.s_id} className="flex items-center mb-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`staff-${staff.s_id}`}
                                                        value={staff.s_id}
                                                        checked={formState.selectedStaffIds.includes(staff.s_id)}
                                                        onChange={handleStaffCheckboxChange}
                                                        className="h-4 w-4 text-blue-600 rounded"
                                                    />
                                                    <label htmlFor={`staff-${staff.s_id}`} className="ml-2 text-gray-700">
                                                        {staff.s_name} (ID: {staff.s_id})
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Latest Maintenance Section */}
                            <div className="mb-6 border-t pt-4 mt-4">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    Latest Maintenance Record {formState.isNewMaintenance && " (New)"}
                                </h3>
                                {formState.latestMaintenance && (
                                    <>
                                        <p className="text-gray-500 text-sm mb-2">
                                            {formState.isNewMaintenance
                                                ? "Fill in to add a new maintenance record. Date will default to current if empty."
                                                : "Edit fields below. Changing the date will create a new maintenance record and delete the old one. Clear all fields to delete this record."
                                            }
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="mb-4">
                                                <label htmlFor="ma_dateti" className="block text-gray-700 text-sm font-bold mb-2">Date:</label>
                                                <input
                                                    type="date"
                                                    id="ma_dateti"
                                                    name="ma_dateti"
                                                    value={formState.latestMaintenance.ma_dateti || ''}
                                                    onChange={handleMaintenanceInputChange}
                                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                />
                                            </div>
                                            <div className="mb-4">
                                                <label htmlFor="ma_brand" className="block text-gray-700 text-sm font-bold mb-2">Brand:</label>
                                                <input type="text" id="ma_brand" name="ma_brand" value={formState.latestMaintenance.ma_brand} onChange={handleMaintenanceInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                                            </div>
                                            <div className="mb-4">
                                                <label htmlFor="ma_price" className="block text-gray-700 text-sm font-bold mb-2">Price (Rp):</label>
                                                <input type="number" id="ma_price" name="ma_price" value={formState.latestMaintenance.ma_price} onChange={handleMaintenanceInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" step="0.01" min="0" />
                                            </div>
                                            <div className="mb-4">
                                                <label htmlFor="ma_notes" className="block text-gray-700 text-sm font-bold mb-2">Notes:</label>
                                                <textarea id="ma_notes" name="ma_notes" value={formState.latestMaintenance.ma_notes} onChange={handleMaintenanceInputChange} rows={3} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between mt-6">
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : formState.p_id ? 'Update Printer' : 'Add Printer'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>
                            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && currentPrinter && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h2>
                        <p className="mb-6">
                            Are you sure you want to delete printer **{currentPrinter.p_id} ({currentPrinter.p_condition})**?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeletePrinter}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
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

export default PrinterTable;