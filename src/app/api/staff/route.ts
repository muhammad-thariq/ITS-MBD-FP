// src/app/api/staff/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabaseClient';

export async function GET() {
    try {
        const { data: staff, error } = await supabase
            .from('staff') // Ensure this is lowercase as per DB convention
            .select('s_id, s_name'); // Select only ID and Name for assignment

        if (error) {
            console.error('Error fetching staff:', error.message);
            return NextResponse.json({ message: 'Failed to fetch staff', details: error.message }, { status: 500 });
        }

        return NextResponse.json(staff, { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error fetching staff:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}