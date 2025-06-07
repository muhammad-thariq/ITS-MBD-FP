// src/app/api/dashboard/summary/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabaseClient';

export async function GET() {
    try {
        // --- Total Membership vs Non-Membership Customers ---
        const { count: totalCustomers, error: totalCustomersError } = await supabase
            .from('customer') // Ensure this table name is correct and exists
            .select('*', { count: 'exact', head: true });

        if (totalCustomersError) {
            console.error('Error fetching total customer count:', totalCustomersError.message);
            // Don't throw here, just return 0 or handle gracefully if other data is critical
            // For dashboard summary, it's often better to show partial data than a full error
        }

        const { count: membershipCustomers, error: membershipCustomersError } = await supabase
            .from('membership') // Ensure this table name is correct and exists
            .select('*', { count: 'exact', head: true });

        if (membershipCustomersError) {
            console.error('Error fetching membership customer count:', membershipCustomersError.message);
        }

        const nonMembershipCustomers = (totalCustomers || 0) - (membershipCustomers || 0);

        // --- Number of Staff Members ---
        const { count: totalStaff, error: staffError } = await supabase
            .from('staff') // Ensure this table name is correct and exists
            .select('*', { count: 'exact', head: true });
        if (staffError) {
            console.error('Error fetching total staff count:', staffError.message);
        }

        // --- Printers: Total, In-Service, In-Maintenance ---
        const { data: printers, error: printerError } = await supabase
            .from('printer') // Ensure this table name is correct and exists
            .select('p_id, p_status');
        if (printerError) throw printerError; // Throwing here because printer data is critical for other parts

        const totalPrinters = printers.length;
        const inServicePrinters = printers.filter(p => p.p_status === true).length;
        const inMaintenancePrinters = printers.filter(p => p.p_status === false).length;

        // --- Inventory: Total remaining stocks for each items ---
        const { data: inventoryStockRaw, error: inventoryError } = await supabase
            .from('inventory') // Ensure this table name is correct and exists
            .select('i_name, i_stock');
        if (inventoryError) throw inventoryError;

        const inventoryStock = inventoryStockRaw.map(item => ({
            iName: item.i_name,
            iStock: item.i_stock
        }));

        // Fetch Total Transactions Count
        const { count: totalTransactions, error: transactionsError } = await supabase
            .from('transaction') // Ensure this table name is correct and exists
            .select('*', { count: 'exact', head: true });
        if (transactionsError) {
            console.error('Error fetching total transactions count:', transactionsError.message);
        }

        // Make sure the 'customers' object is explicitly returned here
        return NextResponse.json({
            customers: {
                total: totalCustomers || 0, // Ensure a default of 0 if count is null/undefined due to error
                membership: membershipCustomers || 0,
                nonMembership: nonMembershipCustomers,
            },
            staff: {
                total: totalStaff || 0, // Ensure a default of 0
            },
            printers: {
                total: totalPrinters,
                inService: inServicePrinters,
                inMaintenance: inMaintenancePrinters,
            },
            inventoryStock: inventoryStock,
            totalTransactions: totalTransactions || 0, // Ensure a default of 0
        });

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) { // Type guard to safely access error properties
            errorMessage = error.message;
        }
        console.error('Final catch block: Error fetching dashboard summary:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}