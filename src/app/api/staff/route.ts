// src/app/api/staff/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabaseClient';

// Helper function to generate the next S_ID
async function generateNextStaffId(): Promise<string> {
    const { data, error } = await supabase
        .from('staff')
        .select('s_id')
        .order('s_id', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest staff ID:', error.message);
        throw new Error('Failed to generate next staff ID due to database error.');
    }

    let lastIdNumber = 0;
    if (data && data.length > 0) {
        const latestId = data[0].s_id;
        // Assuming ID format is SXXXXX, extract the numeric part
        const numericPart = parseInt(latestId.substring(1), 10);
        lastIdNumber = numericPart;
    }

    const nextIdNumber = lastIdNumber + 1;
    // Format to S00001, S00002, etc.
    const nextId = `S${String(nextIdNumber).padStart(5, '0')}`;

    return nextId;
}

// GET all staff with pagination
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const orderBy = searchParams.get('orderBy') || 's_id';
        const orderDirection = (searchParams.get('orderDirection') || 'asc').toLowerCase() === 'desc' ? false : true;

        // Fetch total count for pagination
        const { count: totalCount, error: countError } = await supabase
            .from('staff')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error fetching staff count:', countError.message);
            return NextResponse.json({ message: 'Failed to fetch staff count', details: countError.message }, { status: 500 });
        }

        // Fetch paginated staff data
        const { data: staff, error: dataError } = await supabase
            .from('staff')
            .select('*') // Select all columns for simplicity in this example
            .order(orderBy, { ascending: orderDirection })
            .range(offset, offset + limit - 1);

        if (dataError) {
            console.error('Error fetching paginated staff:', dataError.message);
            return NextResponse.json({ message: 'Failed to fetch staff', details: dataError.message }, { status: 500 });
        }

        return NextResponse.json({
            staffMembers: staff, // Renamed 'staff' to 'staffMembers' to avoid conflict if `staff` is a keyword
            totalCount: totalCount
        }, { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error fetching staff:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// POST: Create a new staff member
export async function POST(req: Request) {
    try {
        const { s_name, s_phone, s_address, s_gender } = await req.json();

        // Validate input
        if (!s_name || !s_phone || !s_gender) {
            return NextResponse.json({ message: 'Missing required fields: s_name, s_phone, s_gender' }, { status: 400 });
        }
        if (!['M', 'F', 'O'].includes(s_gender.toUpperCase())) {
            return NextResponse.json({ message: 'Invalid s_gender. Must be "M", "F", or "O".' }, { status: 400 });
        }

        // Generate a new unique staff ID
        const newId = await generateNextStaffId();

        // Insert new staff member into the database
        const { data, error } = await supabase
            .from('staff')
            .insert([{ s_id: newId, s_name, s_phone, s_address, s_gender: s_gender.toUpperCase() }])
            .select();

        if (error) {
            console.error('Error creating staff member:', error.message);
            return NextResponse.json({ message: 'Failed to create staff member', details: error.message }, { status: 500 });
        }
        return NextResponse.json(data[0], { status: 201 });

    } catch (error: any) {
        console.error('Unexpected error creating staff member:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// PUT: Update an existing staff member
export async function PUT(req: Request) {
    try {
        const { s_id, s_name, s_phone, s_address, s_gender } = await req.json();

        // Validate input
        if (!s_id || !s_name || !s_phone || !s_gender) {
            return NextResponse.json({ message: 'Missing required fields: s_id, s_name, s_phone, s_gender' }, { status: 400 });
        }
        if (!['M', 'F', 'O'].includes(s_gender.toUpperCase())) {
            return NextResponse.json({ message: 'Invalid s_gender. Must be "M", "F", or "O".' }, { status: 400 });
        }

        // Update the staff member in the database
        const { data, error } = await supabase
            .from('staff')
            .update({ s_name, s_phone, s_address, s_gender: s_gender.toUpperCase() })
            .eq('s_id', s_id)
            .select();

        if (error) {
            console.error('Error updating staff member:', error.message);
            return NextResponse.json({ message: 'Failed to update staff member', details: error.message }, { status: 500 });
        }
        if (!data || data.length === 0) {
            return NextResponse.json({ message: `Staff member with ID ${s_id} not found.` }, { status: 404 });
        }
        return NextResponse.json(data[0], { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error updating staff member:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// DELETE: Delete a staff member
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const s_id = searchParams.get('s_id');

        if (!s_id) {
            return NextResponse.json({ message: 'Staff ID (s_id) is required for deletion' }, { status: 400 });
        }

        // Check for foreign key constraints before attempting to delete
        // As per schema, 'staff_printer' and 'staff_transact' restrict deletion.
        // It's good to provide a helpful error message.
        const { count: printerCount, error: printerError } = await supabase
            .from('staff_printer')
            .select('*', { count: 'exact', head: true })
            .eq('staff_s_id', s_id);

        if (printerError) {
            console.error('Error checking staff_printer links:', printerError.message);
            return NextResponse.json({ message: 'Failed to check staff printer associations', details: printerError.message }, { status: 500 });
        }
        if (printerCount && printerCount > 0) {
            return NextResponse.json({ message: `Cannot delete staff member ${s_id}. They are assigned to ${printerCount} printer(s). Please remove their printer assignments first.`, details: 'Foreign key constraint violation on staff_printer.' }, { status: 409 });
        }

        const { count: transactCount, error: transactError } = await supabase
            .from('staff_transact')
            .select('*', { count: 'exact', head: true })
            .eq('st_s_id', s_id);

        if (transactError) {
            console.error('Error checking staff_transact links:', transactError.message);
            return NextResponse.json({ message: 'Failed to check staff transaction associations', details: transactError.message }, { status: 500 });
        }
        if (transactCount && transactCount > 0) {
            return NextResponse.json({ message: `Cannot delete staff member ${s_id}. They are linked to ${transactCount} transaction(s). Please remove their transaction associations first.`, details: 'Foreign key constraint violation on staff_transact.' }, { status: 409 });
        }


        // Attempt to delete the staff member
        const { error, count } = await supabase
            .from('staff')
            .delete()
            .eq('s_id', s_id);

        if (error) {
            console.error('Error deleting staff member:', error.message);
            return NextResponse.json({ message: 'Failed to delete staff member', details: error.message }, { status: 500 });
        }
        if (count === 0) {
            return NextResponse.json({ message: `Staff member with ID ${s_id} not found or already deleted.` }, { status: 404 });
        }
        return NextResponse.json({ message: `Staff member ${s_id} deleted successfully` }, { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error deleting staff member:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}