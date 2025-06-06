// src/app/api/printers/function-details/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabaseClient';

export async function GET() {
    try {
        const { data, error } = await supabase
            .rpc('get_printer_details_with_maintenance'); // <--- ENSURE NO ARGUMENTS HERE

        if (error) {
            console.error('Error calling get_printer_details_with_maintenance:', error.message);
            return NextResponse.json({ message: 'Failed to fetch printer details using function', details: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 200 });

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) { // Type guard to safely access error properties
            errorMessage = error.message;
        }
        console.error('Unexpected error in /api/printers/function-details:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}