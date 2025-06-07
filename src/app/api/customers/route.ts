// src/app/api/customers/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabaseClient';

// Helper function to generate the next C_ID
async function generateNextCustomerId(): Promise<string> {
    const { data, error } = await supabase
        .from('customer')
        .select('c_id')
        .order('c_id', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest customer ID:', error.message);
        throw new Error('Failed to generate next customer ID due to database error.');
    }

    let lastIdNumber = 0;
    if (data && data.length > 0) {
        const latestId = data[0].c_id;
        // Assuming ID format is CXXXXX, extract the numeric part
        const numericPart = parseInt(latestId.substring(1), 10);
        lastIdNumber = numericPart;
    }

    const nextIdNumber = lastIdNumber + 1;
    // Format to C00001, C00002, etc.
    const nextId = `C${String(nextIdNumber).padStart(5, '0')}`;

    return nextId;
}

// GET all customers with pagination
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const orderBy = searchParams.get('orderBy') || 'c_id';
        const orderDirection = (searchParams.get('orderDirection') || 'asc').toLowerCase() === 'desc' ? false : true;

        // Fetch total count for pagination
        const { count: totalCount, error: countError } = await supabase
            .from('customer')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error fetching customer count:', countError.message);
            return NextResponse.json({ message: 'Failed to fetch customer count', details: countError.message }, { status: 500 });
        }

        // Fetch paginated customer data
        const { data: customers, error: dataError } = await supabase
            .from('customer')
            .select('*') // Select all columns
            .order(orderBy, { ascending: orderDirection })
            .range(offset, offset + limit - 1);

        if (dataError) {
            console.error('Error fetching paginated customers:', dataError.message);
            return NextResponse.json({ message: 'Failed to fetch customers', details: dataError.message }, { status: 500 });
        }

        return NextResponse.json({
            customers: customers,
            totalCount: totalCount
        }, { status: 200 });

    } catch (error: unknown) { // Changed from 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error('Unexpected error fetching customers:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}

// POST: Create a new customer
export async function POST(req: Request) {
    try {
        const { c_name, c_phone } = await req.json();

        // Validate input
        if (!c_name || !c_phone) {
            return NextResponse.json({ message: 'Missing required fields: c_name, c_phone' }, { status: 400 });
        }

        // Generate a new unique customer ID
        const newId = await generateNextCustomerId();

        // Insert new customer into the database
        const { data, error } = await supabase
            .from('customer')
            .insert([{ c_id: newId, c_name, c_phone }])
            .select();

        if (error) {
            console.error('Error creating customer:', error.message);
            return NextResponse.json({ message: 'Failed to create customer', details: error.message }, { status: 500 });
        }
        return NextResponse.json(data[0], { status: 201 });

    } catch (error: unknown) { // Changed from 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error('Unexpected error creating customer:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}

// PUT: Update an existing customer
export async function PUT(req: Request) {
    try {
        const { c_id, c_name, c_phone } = await req.json();

        // Validate input
        if (!c_id || !c_name || !c_phone) {
            return NextResponse.json({ message: 'Missing required fields: c_id, c_name, c_phone' }, { status: 400 });
        }

        // Update the customer in the database
        const { data, error } = await supabase
            .from('customer')
            .update({ c_name, c_phone })
            .eq('c_id', c_id)
            .select();

        if (error) {
            console.error('Error updating customer:', error.message);
            return NextResponse.json({ message: 'Failed to update customer', details: error.message }, { status: 500 });
        }
        if (!data || data.length === 0) {
            return NextResponse.json({ message: `Customer with ID ${c_id} not found.` }, { status: 404 });
        }
        return NextResponse.json(data[0], { status: 200 });

    } catch (error: unknown) { // Changed from 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error('Unexpected error updating customer:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}

// DELETE: Delete a customer
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const c_id = searchParams.get('c_id');

        if (!c_id) {
            return NextResponse.json({ message: 'Customer ID (c_id) is required for deletion' }, { status: 400 });
        }

        // Attempt to delete the customer item
        const { error, count } = await supabase
            .from('customer')
            .delete()
            .eq('c_id', c_id);

        if (error) {
            // Check for foreign key constraint violation
            if (error.code === '23503') { // PostgreSQL foreign key violation error code
                return NextResponse.json({ message: `Cannot delete customer ${c_id}. It is linked to existing transactions or memberships. Please remove associated records first.`, details: error.message }, { status: 409 });
            }
            console.error('Error deleting customer:', error.message);
            return NextResponse.json({ message: 'Failed to delete customer', details: error.message }, { status: 500 });
        }
        if (count === 0) {
            return NextResponse.json({ message: `Customer with ID ${c_id} not found or already deleted.` }, { status: 404 });
        }
        return NextResponse.json({ message: `Customer ${c_id} deleted successfully` }, { status: 200 });

    } catch (error: unknown) { // Changed from 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error('Unexpected error deleting customer:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}