// src/app/api/printers/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabaseClient';

// Helper function to generate the next P_ID (unchanged)
async function generateNextPrinterId(): Promise<string> {
    const { data, error } = await supabase
        .from('printer')
        .select('p_id')
        .order('p_id', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest printer ID:', error.message);
        throw new Error('Failed to generate next printer ID due to database error.');
    }

    let lastIdNumber = 0;
    if (data && data.length > 0) {
        const latestId = data[0].p_id;
        const numericPart = parseInt(latestId.substring(1), 10);
        lastIdNumber = numericPart;
    }

    const nextIdNumber = lastIdNumber + 1;
    const nextId = `P${String(nextIdNumber).padStart(5, '0')}`;

    return nextId;
}

// GET all printers (with pagination and related data)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const orderBy = searchParams.get('orderBy') || 'p_id';
        const orderDirection = (searchParams.get('orderDirection') || 'asc').toLowerCase() === 'desc' ? false : true;

        const { count: totalCount, error: countError } = await supabase
            .from('printer')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error fetching printer count:', countError.message);
            return NextResponse.json({ message: 'Failed to fetch printer count', details: countError.message }, { status: 500 });
        }

        const { data: printers, error: dataError } = await supabase
            .from('printer')
            // REMOVE THE COMMENT LINE BELOW THIS!
            .select(`
                p_id,
                p_status,
                p_condition,
                maintenance (
                    ma_dateti,
                    ma_brand,
                    ma_price,
                    ma_notes
                ),
                staff_printer (
                    staff (
                        s_id,
                        s_name
                    )
                )
            `)
            .order(orderBy, { ascending: orderDirection })
            .range(offset, offset + limit - 1);

        if (dataError) {
            console.error('Error fetching paginated printers:', dataError.message);
            return NextResponse.json({ message: 'Failed to fetch printers', details: dataError.message }, { status: 500 });
        }

        return NextResponse.json({
            printers: printers,
            totalCount: totalCount
        });

    } catch (error: any) {
        console.error('Unexpected error fetching printers:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { p_status, p_condition } = await req.json();

        if (typeof p_status !== 'boolean' || !p_condition) {
            return NextResponse.json({ message: 'Missing or invalid required fields: p_status (boolean), p_condition' }, { status: 400 });
        }

        const newId = await generateNextPrinterId();

        const { data, error } = await supabase
            .from('printer')
            .insert([{ p_id: newId, p_status, p_condition }])
            .select();

        if (error) {
            console.error('Error creating printer:', error.message);
            return NextResponse.json({ message: 'Failed to create printer', details: error.message }, { status: 500 });
        }
        return NextResponse.json(data[0], { status: 201 });
    } catch (error: any) {
        console.error('Unexpected error creating printer:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { p_id, p_status, p_condition } = await req.json();

        if (!p_id || typeof p_status !== 'boolean' || !p_condition) {
            return NextResponse.json({ message: 'Missing or invalid required fields: p_id, p_status (boolean), p_condition' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('printer')
            .update({ p_status, p_condition })
            .eq('p_id', p_id)
            .select();

        if (error) {
            console.error('Error updating printer:', error.message);
            return NextResponse.json({ message: 'Failed to update printer', details: error.message }, { status: 500 });
        }
        if (!data || data.length === 0) {
            return NextResponse.json({ message: `Printer with ID ${p_id} not found.` }, { status: 404 });
        }
        return NextResponse.json(data[0]);
    } catch (error: any) {
        console.error('Unexpected error updating printer:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const p_id = searchParams.get('p_id');

        if (!p_id) {
            return NextResponse.json({ message: 'Printer ID (p_id) is required for deletion' }, { status: 400 });
        }

        // 1. Delete associated records from the 'maintenance' table first
        const { error: deleteMaintenanceError, count: maintenanceCount } = await supabase
            .from('maintenance')
            .delete()
            .eq('printer_p_id', p_id);

        if (deleteMaintenanceError) {
            console.error('Error deleting associated maintenance records:', deleteMaintenanceError.message);
            return NextResponse.json({
                message: 'Failed to delete associated maintenance records before deleting printer',
                details: deleteMaintenanceError.message
            }, { status: 500 });
        }

        // 2. Delete associated records from the 'staff_printer' table
        const { error: deleteStaffPrinterError, count: staffPrinterCount } = await supabase
            .from('staff_printer')
            .delete()
            .eq('printer_p_id', p_id);

        if (deleteStaffPrinterError) {
            console.error('Error deleting associated staff_printer records:', deleteStaffPrinterError.message);
            return NextResponse.json({
                message: 'Failed to delete associated staff assignments before deleting printer',
                details: deleteStaffPrinterError.message
            }, { status: 500 });
        }

        // 3. Now, delete the printer record
        const { error: deletePrinterError, count: printerCount } = await supabase
            .from('printer')
            .delete()
            .eq('p_id', p_id);

        if (deletePrinterError) {
            console.error('Error deleting printer:', deletePrinterError.message);
            return NextResponse.json({ message: 'Failed to delete printer', details: deletePrinterError.message }, { status: 500 });
        }
        if (printerCount === 0) {
            return NextResponse.json({ message: `Printer with ID ${p_id} not found or already deleted.` }, { status: 404 });
        }
        return NextResponse.json({ message: `Printer ${p_id} and its associated records deleted successfully` }, { status: 200 });
    } catch (error: any) {
        console.error('Unexpected error deleting printer:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}