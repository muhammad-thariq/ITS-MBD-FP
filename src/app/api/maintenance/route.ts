// src/app/api/maintenance/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabaseClient'; // Adjust path if needed

// Interface for the expected payload for maintenance
interface MaintenancePayload {
    ma_dateti: string; // ISO timestamp string
    ma_brand: string;
    ma_price: number;
    ma_notes: string;
    printer_p_id: string; // The printer ID this maintenance belongs to
}

// POST: Create a new maintenance record
export async function POST(req: Request) {
    try {
        const { ma_dateti, ma_brand, ma_price, ma_notes, printer_p_id }: MaintenancePayload = await req.json();

        if (!ma_dateti || !ma_brand || ma_price === undefined || !printer_p_id) {
            return NextResponse.json({ message: 'Missing required fields for maintenance record: ma_dateti, ma_brand, ma_price, printer_p_id' }, { status: 400 });
        }
        if (ma_price < 0) {
            return NextResponse.json({ message: 'Maintenance price cannot be negative' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('maintenance')
            .insert([{
                ma_dateti,
                ma_brand,
                ma_price,
                ma_notes,
                printer_p_id // Ensure this column name is lowercase
            }])
            .select();

        if (error) {
            console.error('Error creating maintenance record:', error.message);
            return NextResponse.json({ message: 'Failed to create maintenance record', details: error.message }, { status: 500 });
        }
        return NextResponse.json(data[0], { status: 201 });

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) { // Type guard
            errorMessage = error.message;
        }
        console.error('Unexpected error creating maintenance record:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}

// PUT: Update an existing maintenance record
// Assumes ma_dateti and printer_p_id are part of the primary key for update.
// We'll update only if the provided ma_dateti matches an existing record for that printer.
export async function PUT(req: Request) {
    try {
        const { ma_dateti, ma_brand, ma_price, ma_notes, printer_p_id }: MaintenancePayload = await req.json();

        if (!ma_dateti || !ma_brand || ma_price === undefined || !printer_p_id) {
            return NextResponse.json({ message: 'Missing required fields for updating maintenance record: ma_dateti, ma_brand, ma_price, printer_p_id' }, { status: 400 });
        }
        if (ma_price < 0) {
            return NextResponse.json({ message: 'Maintenance price cannot be negative' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('maintenance')
            .update({
                ma_brand,
                ma_price,
                ma_notes
            })
            // Use both parts of the composite primary key for the .eq filter
            .eq('ma_dateti', ma_dateti)
            .eq('printer_p_id', printer_p_id)
            .select();

        if (error) {
            console.error('Error updating maintenance record:', error.message);
            return NextResponse.json({ message: 'Failed to update maintenance record', details: error.message }, { status: 500 });
        }
        if (!data || data.length === 0) {
            return NextResponse.json({ message: `Maintenance record for printer ${printer_p_id} at ${ma_dateti} not found.` }, { status: 404 });
        }
        return NextResponse.json(data[0]);

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) { // Type guard
            errorMessage = error.message;
        }
        console.error('Unexpected error updating maintenance record:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}

// DELETE: Delete a maintenance record by its composite primary key
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ma_dateti = searchParams.get('ma_dateti');
        const printer_p_id = searchParams.get('printer_p_id');

        if (!ma_dateti || !printer_p_id) {
            return NextResponse.json({ message: 'Maintenance date and printer ID are required for deletion' }, { status: 400 });
        }

        const { error, count } = await supabase
            .from('maintenance')
            .delete()
            .eq('ma_dateti', ma_dateti)
            .eq('printer_p_id', printer_p_id);

        if (error) {
            console.error('Error deleting maintenance record:', error.message);
            return NextResponse.json({ message: 'Failed to delete maintenance record', details: error.message }, { status: 500 });
        }
        if (count === 0) {
            return NextResponse.json({ message: `Maintenance record for printer ${printer_p_id} at ${ma_dateti} not found or already deleted.` }, { status: 404 });
        }
        return NextResponse.json({ message: 'Maintenance record deleted successfully' }, { status: 200 });
    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) { // Type guard
            errorMessage = error.message;
        }
        console.error('Unexpected error deleting maintenance record:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}