// --- Nama File: ..\my-next-app\src\app\api\transactions\route.ts ---
import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabaseClient';

// Define expected payload types for better type checking
interface TransactionPayload {
    customer_c_id: string;
    staff_s_id: string; // Assuming one staff per transaction for simplicity in form
    printer_p_id?: string; // Optional, if a printer service is part of the transaction
    inventory_items: Array<{
        i_id: string;
        quantity: number;
    }>;
    t_paymentmethod: string;
}

const PRINTER_SERVICE_PRICE = 500; // Fixed price for printer service

export async function POST(req: Request) {
    try {
        const { customer_c_id, staff_s_id, printer_p_id, inventory_items, t_paymentmethod }: TransactionPayload = await req.json();

        // Basic validation
        if (!customer_c_id || !staff_s_id || !t_paymentmethod || !inventory_items) {
            return NextResponse.json({ message: 'Missing required transaction fields.' }, { status: 400 });
        }

        // Validate inventory items format
        if (!Array.isArray(inventory_items) || inventory_items.some(item => !item.i_id || typeof item.quantity !== 'number' || item.quantity <= 0)) {
            return NextResponse.json({ message: 'Invalid inventory items format. Each item needs i_id and a positive quantity.' }, { status: 400 });
        }

        let totalTransactionPrice = 0;
        const transactionInventoryInserts = [];

        // 1. Calculate total price and prepare inventory inserts, and validate stock
        for (const item of inventory_items) {
            const { data: inventoryData, error: inventoryError } = await supabase
                .from('inventory')
                .select('i_price, i_stock, i_name') // <--- ADDED i_name here
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

        // Add printer service price if a printer is involved
        if (printer_p_id) {
            const { data: printerData, error: printerError } = await supabase
                .from('printer')
                .select('p_id')
                .eq('p_id', printer_p_id)
                .single();

            if (printerError || !printerData) {
                return NextResponse.json({ message: `Printer ${printer_p_id} not found.`, details: printerError?.message }, { status: 404 });
            }
            totalTransactionPrice += PRINTER_SERVICE_PRICE;
        }

        // 2. Generate a new transaction ID
        // This is a basic increment. For high-concurrency, consider a database sequence or UUID.
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

        // Use a database transaction to ensure atomicity for complex operations
        // Supabase doesn't have a direct "transaction" block on client side,
        // so we'll simulate by handling errors and rolling back (or assuming success/failure of each step).
        // For truly atomic operations, a stored procedure in PG is better.
        // However, for standard Next.js API, this is common practice with proper error handling.

        // 3. Insert into `transaction` table
        // This will trigger `trg_membership_points_benefits` BEFORE insertion
        const { data: insertedTransaction, error: insertTxError } = await supabase
            .from('transaction')
            .insert({
                t_id: newTxId,
                customer_c_id: customer_c_id,
                t_totalprice: totalTransactionPrice, // This price will be modified by the trigger
                t_paymentmethod: t_paymentmethod,
                // t_datetime defaults to CURRENT_TIMESTAMP in DB
            })
            .select('t_id, t_totalprice') // Select the final total price after trigger
            .single();

        if (insertTxError || !insertedTransaction) {
            console.error('Error inserting transaction:', insertTxError?.message);
            return NextResponse.json({ message: 'Failed to create main transaction record.', details: insertTxError?.message }, { status: 500 });
        }

        // 4. Insert into `staff_transact`
        const { error: staffTxError } = await supabase
            .from('staff_transact')
            .insert({
                st_s_id: staff_s_id,
                tr_t_id: newTxId
            });

        if (staffTxError) {
            console.error('Error inserting staff_transact:', staffTxError.message);
            // In a real scenario, you'd roll back the transaction here if not using a stored procedure
            return NextResponse.json({ message: 'Failed to link staff to transaction.', details: staffTxError.message }, { status: 500 });
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
                console.error('Error inserting printer_transaction:', printerTxError.message);
                return NextResponse.json({ message: 'Failed to link printer to transaction.', details: printerTxError.message }, { status: 500 });
            }
        }

        // 6. Insert into `transaction_inventory`
        // This will trigger `trg_inventory_stock_reduction` AFTER insertion for each item
        if (transactionInventoryInserts.length > 0) {
            // Add the transaction_t_id to each item
            const insertsWithTxId = transactionInventoryInserts.map(item => ({
                ...item,
                transaction_t_id: newTxId
            }));

            const { error: invTxError } = await supabase
                .from('transaction_inventory')
                .insert(insertsWithTxId);

            if (invTxError) {
                console.error('Error inserting transaction_inventory:', invTxError.message);
                return NextResponse.json({ message: 'Failed to link inventory items to transaction.', details: invTxError.message }, { status: 500 });
            }
        }

        // All successful
        return NextResponse.json({
            message: 'Transaction added successfully!',
            t_id: insertedTransaction.t_id,
            final_total_price: parseFloat(insertedTransaction.t_totalprice) // Ensure it's a number
        }, { status: 201 });

    } catch (error: any) {
        console.error('Unexpected error in /api/transactions POST:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}