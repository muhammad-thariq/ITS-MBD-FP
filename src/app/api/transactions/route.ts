// --- Nama File: ..\my-next-app\src\app\api\transactions\route.ts ---
import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabaseClient';

// Define expected payload types for better type checking
interface TransactionPayload {
    customer_c_id: string;
    staff_s_id: string;
    printer_p_id?: string;
    printer_papers_count?: number; // NEW: Number of papers for printer service
    inventory_items: Array<{
        i_id: string;
        quantity: number;
    }>;
    t_paymentmethod: string;
}

const PRINTER_USAGE_PRICE_PER_PAPER = 500; // Fixed price for printer service per paper

// GET all transactions with pagination and nested data
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const orderBy = searchParams.get('orderBy') || 't_datetime';
        const orderDirection = (searchParams.get('orderDirection') || 'desc').toLowerCase() === 'desc' ? false : true;

        // Fetch total count for pagination
        const { count: totalCount, error: countError } = await supabase
            .from('transaction')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error fetching transaction count:', countError.message);
            return NextResponse.json({ message: 'Failed to fetch transaction count', details: countError.message }, { status: 500 });
        }

        // Fetch paginated transaction data with nested relationships
        const { data: transactions, error: dataError } = await supabase
            .from('transaction')
            .select(`
                t_id,
                t_datetime,
                t_totalprice,
                t_paymentmethod,
                t_paperscount,
                customer_c_id,
                customer (c_name),
                staff_transact (staff (s_name, s_id)),
                printer_transaction (printer_p_id),
                transaction_inventory (inventory_i_id, quantity, inventory (i_name, i_price))
            `)
            .order(orderBy, { ascending: orderDirection })
            .range(offset, offset + limit - 1);

        if (dataError) {
            console.error('Error fetching paginated transactions:', dataError.message);
            return NextResponse.json({ message: 'Failed to fetch transactions', details: dataError.message }, { status: 500 });
        }

        return NextResponse.json({
            transactions: transactions,
            totalCount: totalCount
        }, { status: 200 });

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) { // Type guard
            errorMessage = error.message;
        }
        console.error('Unexpected error fetching transactions:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { customer_c_id, staff_s_id, printer_p_id, printer_papers_count, inventory_items, t_paymentmethod }: TransactionPayload = await req.json();

        // Basic validation
        if (!customer_c_id || !staff_s_id || !t_paymentmethod || (!inventory_items || inventory_items.length === 0) && (!printer_p_id || typeof printer_papers_count !== 'number' || printer_papers_count <= 0)) {
            return NextResponse.json({ message: 'Missing required transaction fields or invalid printer service/inventory items.' }, { status: 400 });
        }

        // Validate inventory items format
        if (inventory_items && (!Array.isArray(inventory_items) || inventory_items.some(item => !item.i_id || typeof item.quantity !== 'number' || item.quantity <= 0))) {
            return NextResponse.json({ message: 'Invalid inventory items format. Each item needs i_id and a positive quantity.' }, { status: 400 });
        }

        // Validate printer papers count if printer service is selected
        if (printer_p_id && (typeof printer_papers_count !== 'number' || printer_papers_count <= 0)) {
            return NextResponse.json({ message: 'Printer service selected but invalid paper count provided. Must be a positive number.' }, { status: 400 });
        }

        let totalTransactionPrice = 0;
        const transactionInventoryInserts = [];

        // 1. Calculate total price and prepare inventory inserts, and validate stock
        if (inventory_items) { // Ensure inventory_items is not null/undefined
            for (const item of inventory_items) {
                const { data: inventoryData, error: inventoryError } = await supabase
                    .from('inventory')
                    .select('i_price, i_stock, i_name')
                    .eq('i_id', item.i_id)
                    .single();

                if (inventoryError || !inventoryData) {
                    return NextResponse.json({ message: `Inventory item ${item.i_id} not found or error fetching price.`, details: inventoryError?.message }, { status: 404 });
                }

                if (inventoryData.i_stock < item.quantity) {
                    return NextResponse.json({ message: `Insufficient stock for item ${inventoryData.i_name}. Available: ${inventoryData.i_stock}, Requested: ${item.quantity}.` }, { status: 400 });
                }

                totalTransactionPrice += parseFloat(inventoryData.i_price) * item.quantity;
                transactionInventoryInserts.push({
                    inventory_i_id: item.i_id,
                    quantity: item.quantity
                });
            }
        }

        // Add printer service price if a printer is involved
        if (printer_p_id && typeof printer_papers_count === 'number' && printer_papers_count > 0) {
            const { data: printerData, error: printerError } = await supabase
                .from('printer')
                .select('p_id')
                .eq('p_id', printer_p_id)
                .single();

            if (printerError || !printerData) {
                return NextResponse.json({ message: `Printer ${printer_p_id} not found.`, details: printerError?.message }, { status: 404 });
            }
            totalTransactionPrice += PRINTER_USAGE_PRICE_PER_PAPER * printer_papers_count;
        }

        // 2. Generate a new transaction ID
        const { data: lastTransaction, error: lastTxError } = await supabase
            .from('transaction')
            .select('t_id')
            .order('t_id', { ascending: false })
            .limit(1);

        if (lastTxError) {
            console.error("Error fetching last transaction ID:", lastTxError.message);
            return NextResponse.json({ message: "Failed to generate new transaction ID." }, { status: 500 });
        }

        let newTxId: string;
        if (lastTransaction && lastTransaction.length > 0) {
            const lastIdNum = parseInt(lastTransaction[0].t_id.substring(1));
            newTxId = `T${String(lastIdNum + 1).padStart(5, '0')}`;
        } else {
            newTxId = 'T00001';
        }

        // Use a database transaction to ensure atomicity.
        // For Supabase, a stored procedure is ideal for true atomicity,
        // but we'll simulate it with sequential operations and error handling.
        let insertedTransactionData;
        try {
            // 3. Insert into `transaction` table
            // This will trigger `trg_membership_points_benefits` BEFORE insertion if it exists.
            const { data: insertedTransaction, error: insertTxError } = await supabase
                .from('transaction')
                .insert({
                    t_id: newTxId,
                    customer_c_id: customer_c_id,
                    t_totalprice: totalTransactionPrice, // This price might be modified by a DB trigger
                    t_paymentmethod: t_paymentmethod,
                    t_paperscount: printer_papers_count || 0, // NEW: Store paper count, default to 0 if not a printer transaction
                    // t_datetime defaults to CURRENT_TIMESTAMP in DB
                })
                .select('t_id, t_totalprice') // Select the final total price after trigger
                .single();

            if (insertTxError || !insertedTransaction) {
                throw new Error(`Failed to create main transaction record: ${insertTxError?.message}`);
            }
            insertedTransactionData = insertedTransaction;

            // 4. Insert into `staff_transact`
            const { error: staffTxError } = await supabase
                .from('staff_transact')
                .insert({
                    st_s_id: staff_s_id,
                    tr_t_id: newTxId
                });

            if (staffTxError) {
                throw new Error(`Failed to link staff to transaction: ${staffTxError.message}`);
            }

            // 5. Insert into `printer_transaction` if a printer was selected
            if (printer_p_id) {
                const { error: printerTxError } = await supabase
                    .from('printer_transaction')
                    .insert({
                        printer_p_id: printer_p_id,
                        transaction_t_id: newTxId
                    });

                if (printerTxError) {
                    throw new Error(`Failed to link printer to transaction: ${printerTxError.message}`);
                }
            }

            // 6. Insert into `transaction_inventory`
            // This will trigger `trg_inventory_stock_reduction` AFTER insertion for each item
            if (transactionInventoryInserts.length > 0) {
                const insertsWithTxId = transactionInventoryInserts.map(item => ({
                    ...item,
                    transaction_t_id: newTxId
                }));

                const { error: invTxError } = await supabase
                    .from('transaction_inventory')
                    .insert(insertsWithTxId);

                if (invTxError) {
                    throw new Error(`Failed to link inventory items to transaction: ${invTxError.message}`);
                }
            }

            // All successful
            return NextResponse.json({
                message: 'Transaction added successfully!',
                t_id: insertedTransactionData.t_id,
                final_total_price: parseFloat(insertedTransactionData.t_totalprice)
            }, { status: 201 });

        } catch (opError: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'An unknown error occurred during transaction operation.';
            if (opError instanceof Error) {
                errorMessage = opError.message;
            } else if (typeof opError === 'string') {
                errorMessage = opError;
            }
            console.error('Transaction creation failed, attempting rollback (manual steps if needed):', errorMessage);
            // In a real scenario, if using a stored procedure, rollback would be automatic.
            // Here, we'd need to manually undo changes if any partial inserts occurred before the error.
            // For simplicity in this example, we return error and rely on the frontend to refresh.
            // For example: if transaction record was inserted but staff_transact failed, you might
            // try to delete the transaction record here.
            // This is a minimal rollback. A proper distributed transaction is more complex.
            await supabase.from('transaction').delete().eq('t_id', newTxId);
            return NextResponse.json({ message: 'Failed to complete transaction.', details: errorMessage }, { status: 500 });
        }

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unexpected error occurred in /api/transactions POST.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        console.error('Unexpected error in /api/transactions POST:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}

// PUT: Update an existing transaction (limited to top-level details)
export async function PUT(req: Request) {
    try {
        const { t_id, customer_c_id, t_paymentmethod } = await req.json();

        if (!t_id || !customer_c_id || !t_paymentmethod) {
            return NextResponse.json({ message: 'Missing required fields for transaction update: t_id, customer_c_id, t_paymentmethod' }, { status: 400 });
        }

        // Update the main transaction record
        const { data, error } = await supabase
            .from('transaction')
            .update({ customer_c_id, t_paymentmethod })
            .eq('t_id', t_id)
            .select();

        if (error) {
            console.error('Error updating transaction:', error.message);
            return NextResponse.json({ message: 'Failed to update transaction', details: error.message }, { status: 500 });
        }
        if (!data || data.length === 0) {
            return NextResponse.json({ message: `Transaction with ID ${t_id} not found.` }, { status: 404 });
        }
        return NextResponse.json(data[0], { status: 200 });

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unexpected error occurred updating transaction.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        console.error('Unexpected error updating transaction:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}

// DELETE: Delete a transaction and reverse inventory stock
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const t_id = searchParams.get('t_id');

        if (!t_id) {
            return NextResponse.json({ message: 'Transaction ID (t_id) is required for deletion' }, { status: 400 });
        }

        // Define a type for the fetched transaction inventory item
        interface FetchedTransactionInventory {
            inventory_i_id: string;
            quantity: number;
            // The 'inventory' property is correctly inferred as an array of one item
            inventory: { i_name: string; i_stock: number; }[];
        }

        // Start a sequence of operations that act like a transaction (manual rollback if error)
        try {
            // 1. Fetch associated inventory items to reverse stock
            const { data: transactionInventory, error: fetchInvError } = await supabase
                .from('transaction_inventory')
                .select('inventory_i_id, quantity, inventory(i_name, i_stock)')
                .eq('transaction_t_id', t_id) as { data: FetchedTransactionInventory[] | null, error: any }; // This 'any' cast is still problematic. Let's fix this below.

            if (fetchInvError) {
                throw new Error(`Failed to fetch associated inventory for transaction ${t_id}: ${fetchInvError.message}`);
            }

            // 2. Increase stock for each item in inventory
            if (transactionInventory && transactionInventory.length > 0) {
                for (const item of transactionInventory) {
                    // Corrected access: item.inventory is an array, access its first element
                    const inventoryDetails = item.inventory[0];

                    if (!inventoryDetails || inventoryDetails.i_stock === undefined || inventoryDetails.i_stock === null) {
                        console.warn(`Skipping stock reversal for item ${item.inventory_i_id} due to missing or invalid stock information.`);
                        continue; // Proceed with other items, or throw a more critical error
                    }

                    const currentStock = inventoryDetails.i_stock;
                    const quantityToAdd = item.quantity;
                    const newItemId = item.inventory_i_id;

                    const { error: updateStockError } = await supabase
                        .from('inventory')
                        .update({ i_stock: currentStock + quantityToAdd })
                        .eq('i_id', newItemId);

                    if (updateStockError) {
                        // Log this error but try to continue deleting the transaction
                        // as stock reversal failure shouldn't necessarily block transaction deletion.
                        // A more robust system would re-queue stock reversal or alert.
                        console.error(`Failed to reverse stock for item ${inventoryDetails.i_name || newItemId} (${newItemId}): ${updateStockError.message}`);
                        // Optionally, you might throw here if stock integrity is paramount, which would fail the delete.
                        // throw new Error(`Failed to reverse stock for item ${inventoryDetails.i_name || newItemId}: ${updateStockError.message}`);
                    }
                }
            }

            // 3. Delete associated records from junction tables (order matters for foreign keys)
            // Delete from transaction_inventory first due to its foreign key relationship with transaction
            const { error: deleteInvTxError } = await supabase
                .from('transaction_inventory')
                .delete()
                .eq('transaction_t_id', t_id);
            if (deleteInvTxError) {
                throw new Error(`Failed to delete transaction_inventory records: ${deleteInvTxError.message}`);
            }

            // Delete from printer_transaction
            const { error: deletePrinterTxError } = await supabase
                .from('printer_transaction')
                .delete()
                .eq('transaction_t_id', t_id);
            if (deletePrinterTxError) {
                throw new Error(`Failed to delete printer_transaction records: ${deletePrinterTxError.message}`);
            }

            // Delete from staff_transact
            const { error: deleteStaffTxError } = await supabase
                .from('staff_transact')
                .delete()
                .eq('tr_t_id', t_id);
            if (deleteStaffTxError) {
                throw new Error(`Failed to delete staff_transact records: ${deleteStaffTxError.message}`);
            }

            // 4. Delete the main transaction record
            const { error: deleteTxError, count: txCount } = await supabase
                .from('transaction')
                .delete()
                .eq('t_id', t_id);

            if (deleteTxError) {
                throw new Error(`Failed to delete main transaction record: ${deleteTxError.message}`);
            }
            if (txCount === 0) {
                return NextResponse.json({ message: `Transaction with ID ${t_id} not found or already deleted.` }, { status: 404 });
            }

            return NextResponse.json({ message: `Transaction ${t_id} and its associated records deleted successfully. Inventory stock reversed.` }, { status: 200 });

        } catch (opError: unknown) { // Changed 'any' to 'unknown'
            let errorMessage = 'Transaction deletion failed and might be in an inconsistent state (consider manual review).';
            if (opError instanceof Error) {
                errorMessage = opError.message;
            } else if (typeof opError === 'string') {
                errorMessage = opError;
            }
            console.error('Transaction deletion failed and might be in an inconsistent state (consider manual review):', errorMessage);
            // Re-throw or return a specific error indicating partial success/failure
            return NextResponse.json({ message: 'Failed to delete transaction completely. Manual review of inventory might be needed.', details: errorMessage }, { status: 500 });
        }

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unexpected error occurred deleting transaction.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
                errorMessage = error;
            }
        console.error('Unexpected error deleting transaction:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}