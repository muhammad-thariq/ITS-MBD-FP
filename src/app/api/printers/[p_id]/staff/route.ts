// src/app/api/printers/[p_id]/staff/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../../../utils/supabaseClient';

export async function PUT(req: Request, { params }: { params: { p_id: string } }) {
    try {
        // Await params to ensure it's fully resolved before destructuring
        const { p_id } = await params;
        const { staffIds } = await req.json();

        if (!p_id) {
            return NextResponse.json({ message: 'Printer ID is required' }, { status: 400 });
        }
        if (!Array.isArray(staffIds)) {
            return NextResponse.json({ message: 'staffIds must be an array' }, { status: 400 });
        }

        // 1. Delete existing staff assignments for this printer
        // Changed table and column names to lowercase as per PostgreSQL convention
        const { error: deleteError } = await supabase
            .from('staff_printer') // Changed to lowercase
            .delete()
            .eq('printer_p_id', p_id); // Changed to lowercase

        if (deleteError) {
            console.error('Error deleting existing staff assignments:', deleteError.message);
            return NextResponse.json({ message: 'Failed to clear existing staff assignments', details: deleteError.message }, { status: 500 });
        }

        // 2. Insert new staff assignments
        if (staffIds.length > 0) {
            const recordsToInsert = staffIds.map((s_id: string) => ({
                staff_s_id: s_id, // Changed to lowercase
                printer_p_id: p_id // Changed to lowercase
            }));

            // Changed table name to lowercase
            const { error: insertError } = await supabase
                .from('staff_printer') // Changed to lowercase
                .insert(recordsToInsert);

            if (insertError) {
                console.error('Error inserting new staff assignments:', insertError.message);
                return NextResponse.json({ message: 'Failed to assign new staff', details: insertError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ message: 'Staff assignments updated successfully' }, { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error in PUT /api/printers/[p_id]/staff:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: { p_id: string } }) {
    try {
        // Await params to ensure it's fully resolved before destructuring
        const { p_id } = await params;

        if (!p_id) {
            return NextResponse.json({ message: 'Printer ID is required' }, { status: 400 });
        }

        // Changed table and column names to lowercase for consistency
        const { data, error } = await supabase
            .from('staff_printer') // Changed to lowercase
            .select(`
                staff_s_id,
                printer_p_id,
                staff (
                    s_id,
                    s_name
                )
            `)
            .eq('printer_p_id', p_id); // Changed to lowercase

        if (error) {
            console.error('Error fetching staff assignments for printer:', error.message);
            return NextResponse.json({ message: 'Failed to fetch staff assignments', details: error.message }, { status: 500 });
        }

        const assignedStaff = data.map(record => record.staff).filter(staff => staff !== null);

        return NextResponse.json({ assignedStaff }, { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error fetching staff assignments for printer:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
