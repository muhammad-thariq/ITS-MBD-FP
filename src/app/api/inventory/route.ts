// src/app/api/inventory/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabaseClient';

// Helper function to generate the next I_ID
async function generateNextInventoryId(): Promise<string> {
    const { data, error } = await supabase
        .from('inventory')
        .select('i_id')
        .order('i_id', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest inventory ID:', error.message);
        throw new Error('Failed to generate next inventory ID due to database error.');
    }

    let lastIdNumber = 0;
    if (data && data.length > 0) {
        const latestId = data[0].i_id;
        // Assuming ID format is IXXXXX, extract the numeric part
        const numericPart = parseInt(latestId.substring(1), 10);
        lastIdNumber = numericPart;
    }

    const nextIdNumber = lastIdNumber + 1;
    // Format to I00001, I00002, etc.
    const nextId = `I${String(nextIdNumber).padStart(5, '0')}`;

    return nextId;
}

// GET all inventory items with pagination
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const orderBy = searchParams.get('orderBy') || 'i_id';
        const orderDirection = (searchParams.get('orderDirection') || 'asc').toLowerCase() === 'desc' ? false : true;

        // Fetch total count for pagination
        const { count: totalCount, error: countError } = await supabase
            .from('inventory')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error fetching inventory count:', countError.message);
            return NextResponse.json({ message: 'Failed to fetch inventory count', details: countError.message }, { status: 500 });
        }

        // Fetch paginated inventory data
        const { data: inventory, error: dataError } = await supabase
            .from('inventory')
            .select('*') // Select all columns for simplicity in this example
            .order(orderBy, { ascending: orderDirection })
            .range(offset, offset + limit - 1);

        if (dataError) {
            console.error('Error fetching paginated inventory:', dataError.message);
            return NextResponse.json({ message: 'Failed to fetch inventory items', details: dataError.message }, { status: 500 });
        }

        return NextResponse.json({
            inventoryItems: inventory,
            totalCount: totalCount
        }, { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error fetching inventory:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// POST: Create a new inventory item
export async function POST(req: Request) {
    try {
        const { i_name, i_stock, i_price } = await req.json();

        // Validate input
        if (!i_name || typeof i_stock !== 'number' || i_stock < 0 || typeof i_price !== 'number' || i_price < 0) {
            return NextResponse.json({ message: 'Missing or invalid required fields: i_name (string), i_stock (non-negative number), i_price (non-negative number)' }, { status: 400 });
        }

        // Generate a new unique inventory ID
        const newId = await generateNextInventoryId();

        // Insert new inventory item into the database
        const { data, error } = await supabase
            .from('inventory')
            .insert([{ i_id: newId, i_name, i_stock, i_price }])
            .select();

        if (error) {
            console.error('Error creating inventory item:', error.message);
            return NextResponse.json({ message: 'Failed to create inventory item', details: error.message }, { status: 500 });
        }
        return NextResponse.json(data[0], { status: 201 });

    } catch (error: any) {
        console.error('Unexpected error creating inventory item:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// PUT: Update an existing inventory item
export async function PUT(req: Request) {
    try {
        const { i_id, i_name, i_stock, i_price } = await req.json();

        // Validate input
        if (!i_id || !i_name || typeof i_stock !== 'number' || i_stock < 0 || typeof i_price !== 'number' || i_price < 0) {
            return NextResponse.json({ message: 'Missing or invalid required fields: i_id, i_name (string), i_stock (non-negative number), i_price (non-negative number)' }, { status: 400 });
        }

        // Update the inventory item in the database
        const { data, error } = await supabase
            .from('inventory')
            .update({ i_name, i_stock, i_price })
            .eq('i_id', i_id)
            .select();

        if (error) {
            console.error('Error updating inventory item:', error.message);
            return NextResponse.json({ message: 'Failed to update inventory item', details: error.message }, { status: 500 });
        }
        if (!data || data.length === 0) {
            return NextResponse.json({ message: `Inventory item with ID ${i_id} not found.` }, { status: 404 });
        }
        return NextResponse.json(data[0], { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error updating inventory item:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// DELETE: Delete an inventory item
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const i_id = searchParams.get('i_id');

        if (!i_id) {
            return NextResponse.json({ message: 'Inventory ID (i_id) is required for deletion' }, { status: 400 });
        }

        // Attempt to delete the inventory item
        const { error, count } = await supabase
            .from('inventory')
            .delete()
            .eq('i_id', i_id);

        if (error) {
            // Check for foreign key constraint violation
            if (error.code === '23503') { // PostgreSQL foreign key violation error code
                return NextResponse.json({ message: `Cannot delete inventory item ${i_id}. It is linked to existing transactions. Please remove associated transactions first.`, details: error.message }, { status: 409 });
            }
            console.error('Error deleting inventory item:', error.message);
            return NextResponse.json({ message: 'Failed to delete inventory item', details: error.message }, { status: 500 });
        }
        if (count === 0) {
            return NextResponse.json({ message: `Inventory item with ID ${i_id} not found or already deleted.` }, { status: 404 });
        }
        return NextResponse.json({ message: `Inventory item ${i_id} deleted successfully` }, { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error deleting inventory item:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
