// --- Nama File: ..\my-next-app\src\components\AddTransactionModal.tsx ---
'use client';

import React, { useState, useEffect } from 'react';
import Card from './Card'; // Assuming you have a Card component

// Interfaces for fetched data (for dropdowns)
interface CustomerOption {
    c_id: string;
    c_name: string;
}

interface StaffOption {
    s_id: string;
    s_name: string;
}

interface PrinterOption {
    p_id: string;
    p_condition: string;
}

interface InventoryItemOption {
    i_id: string;
    i_name: string;
    i_stock: number;
    i_price: number;
}

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransactionAdded: (success: boolean) => void; // Callback to refresh dashboard data
}

const PRINTER_SERVICE_CHARGE = 500; // Define fixed printer service charge

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onTransactionAdded }) => {
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [staff, setStaff] = useState<StaffOption[]>([]);
    const [printers, setPrinters] = useState<PrinterOption[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([]);

    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [selectedPrinter, setSelectedPrinter] = useState<string>(''); // For printer service
    const [selectedInventory, setSelectedInventory] = useState<{ i_id: string; quantity: number }[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<string>('');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formMessage, setFormMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    // Fetch dropdown data on modal open
    useEffect(() => {
        if (!isOpen) return;

        const fetchDropdownData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch all customers and staff with a large limit for dropdowns
                const [customersRes, staffRes, printersRes, inventoryRes] = await Promise.all([
                    fetch('/api/customers?limit=9999'),
                    fetch('/api/staff?limit=9999'),
                    fetch('/api/printers/function-details'),
                    fetch('/api/inventory/details'),
                ]);

                if (!customersRes.ok) throw new Error('Failed to fetch customers');
                if (!staffRes.ok) throw new Error('Failed to fetch staff');
                if (!printersRes.ok) throw new Error('Failed to fetch printers');
                if (!inventoryRes.ok) throw new Error('Failed to fetch inventory');

                // MODIFICATION START: Correctly destructure API responses
                const { customers: customersData }: { customers: CustomerOption[] } = await customersRes.json();
                const { staffMembers: staffData }: { staffMembers: StaffOption[] } = await staffRes.json();
                // MODIFICATION END

                const printersData: PrinterOption[] = await printersRes.json(); // This API returns array directly
                const inventoryData: InventoryItemOption[] = await inventoryRes.json(); // This API returns array directly

                setCustomers(customersData);
                setStaff(staffData);
                setPrinters(printersData);
                setInventoryItems(inventoryData);

                // Set initial selections if data is available
                if (customersData.length > 0) setSelectedCustomer(customersData[0].c_id);
                if (staffData.length > 0) setSelectedStaff(staffData[0].s_id);
                // No default printer selection for now as it's optional
            } catch (err: any) {
                console.error("Error fetching dropdown data:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDropdownData();
    }, [isOpen]); // Refetch when modal opens

    // Reset form state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedCustomer('');
            setSelectedStaff('');
            setSelectedPrinter('');
            setSelectedInventory([]);
            setPaymentMethod('');
            setFormMessage(null);
            setMessageType('success');
            setError(null);
        }
    }, [isOpen]);

    const handleInventoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const itemId = e.target.value;
        const checked = e.target.checked;

        if (checked) {
            // Add item with default quantity 1, or remove if unchecked
            setSelectedInventory(prev => {
                // Ensure no duplicates and initialize quantity
                if (!prev.some(item => item.i_id === itemId)) {
                    return [...prev, { i_id: itemId, quantity: 1 }];
                }
                return prev;
            });
        } else {
            setSelectedInventory(prev => prev.filter(item => item.i_id !== itemId));
        }
    };

    const handleInventoryQuantityChange = (itemId: string, quantity: number) => {
        setSelectedInventory(prev =>
            prev.map(item => (item.i_id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item))
        );
    };

    const calculateEstimatedTotalPrice = () => {
        let total = 0;
        selectedInventory.forEach(selectedItem => {
            const itemDetails = inventoryItems.find(inv => inv.i_id === selectedItem.i_id);
            if (itemDetails) {
                total += itemDetails.i_price * selectedItem.quantity;
            }
        });
        if (selectedPrinter) {
            total += PRINTER_SERVICE_CHARGE;
        }
        return total;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormMessage(null);
        setError(null);

        if (!selectedCustomer || !selectedStaff || !paymentMethod || (selectedInventory.length === 0 && !selectedPrinter)) {
            setMessageType('error');
            setFormMessage('Please fill in all required fields (Customer, Staff, Payment Method) and select at least one Inventory Item or a Printer Service.');
            return;
        }

        // Validate inventory quantities against stock
        for (const selected of selectedInventory) {
            const itemDetails = inventoryItems.find(inv => inv.i_id === selected.i_id);
            if (itemDetails && selected.quantity > itemDetails.i_stock) {
                setMessageType('error');
                setFormMessage(`Not enough stock for ${itemDetails.i_name}. Available: ${itemDetails.i_stock}, Requested: ${selected.quantity}`);
                return;
            }
        }


        const transactionData = {
            customer_c_id: selectedCustomer,
            staff_s_id: selectedStaff,
            printer_p_id: selectedPrinter || undefined, // Send as undefined if not selected
            inventory_items: selectedInventory,
            t_paymentmethod: paymentMethod,
        };

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transactionData),
            });

            if (response.ok) {
                const result = await response.json();
                setMessageType('success');
                setFormMessage(`Transaction ${result.t_id} added successfully! Final total: Rp ${result.final_total_price.toLocaleString('id-ID')}.`);
                onTransactionAdded(true); // Signal dashboard to refresh
                // Optionally close modal after a delay
                // setTimeout(onClose, 3000);
            } else {
                const errorData = await response.json();
                setMessageType('error');
                setError(errorData.message || 'Failed to add transaction.');
                setFormMessage(errorData.message || 'Failed to add transaction.');
                onTransactionAdded(false);
            }
        } catch (err: any) {
            setMessageType('error');
            setError('Network error: ' + err.message);
            setFormMessage('Network error: ' + err.message);
            onTransactionAdded(false);
        }
    };

    if (!isOpen) return null; // Don't render if not open

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl overflow-y-auto max-h-[90vh]">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Transaction</h2>
                {isLoading ? (
                    <p className="text-center text-gray-600">Loading data...</p>
                ) : error ? (
                    <p className="text-center text-red-600">Error: {error}</p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="customer" className="block text-gray-700 text-sm font-bold mb-2">Customer:</label>
                            <select
                                id="customer"
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                                required
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => (
                                    <option key={c.c_id} value={c.c_id}>{c.c_name} (ID: {c.c_id})</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="staff" className="block text-gray-700 text-sm font-bold mb-2">Staff:</label>
                            <select
                                id="staff"
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={selectedStaff}
                                onChange={(e) => setSelectedStaff(e.target.value)}
                                required
                            >
                                <option value="">Select Staff</option>
                                {staff.map(s => (
                                    <option key={s.s_id} value={s.s_id}>{s.s_name} (ID: {s.s_id})</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Printer Service (Fixed Price: Rp {PRINTER_SERVICE_CHARGE.toLocaleString('id-ID')}):</label>
                            <select
                                id="printer"
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={selectedPrinter}
                                onChange={(e) => setSelectedPrinter(e.target.value)}
                            >
                                <option value="">No Printer Service</option>
                                {printers.map(p => (
                                    <option key={p.p_id} value={p.p_id}>{p.p_id} ({p.p_condition})</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Inventory Items:</label>
                            <div className="border p-3 rounded h-48 overflow-y-auto">
                                {inventoryItems.length === 0 ? (
                                    <p className="text-gray-600 text-sm">No inventory items available.</p>
                                ) : (
                                    inventoryItems.map(item => (
                                        <div key={item.i_id} className="flex items-center mb-2">
                                            <input
                                                type="checkbox"
                                                id={`item-${item.i_id}`}
                                                value={item.i_id}
                                                checked={selectedInventory.some(si => si.i_id === item.i_id)}
                                                onChange={handleInventoryChange}
                                                className="mr-2"
                                            />
                                            <label htmlFor={`item-${item.i_id}`} className="flex-1 text-gray-700">
                                                {item.i_name} (Stock: {item.i_stock}, Price: Rp {item.i_price.toLocaleString('id-ID')})
                                            </label>
                                            {selectedInventory.some(si => si.i_id === item.i_id) && (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={item.i_stock} // Limit quantity to available stock
                                                    value={selectedInventory.find(si => si.i_id === item.i_id)?.quantity || 1}
                                                    onChange={(e) => handleInventoryQuantityChange(item.i_id, parseInt(e.target.value))}
                                                    className="w-20 shadow border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            {selectedInventory.length === 0 && !selectedPrinter && (
                                <p className="text-red-500 text-xs mt-1">Please select at least one inventory item OR a printer service.</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="paymentMethod" className="block text-gray-700 text-sm font-bold mb-2">Payment Method:</label>
                            <input
                                type="text"
                                id="paymentMethod"
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mb-6 font-bold text-gray-800">
                            Estimated Total Price: Rp {calculateEstimatedTotalPrice().toLocaleString('id-ID')}
                        </div>

                        {formMessage && (
                            <div className={`mb-4 p-3 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {formMessage}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Adding...' : 'Add Transaction'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AddTransactionModal;