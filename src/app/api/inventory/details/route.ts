import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabaseClient'; // Path adjusted from 'details' folder

export async function GET() {
    try {
        // Call the PostgreSQL function directly using rpc
        const { data, error } = await supabase
            .rpc('get_all_inventory_details'); // Name of the function you just created

        if (error) {
            console.error('Error calling get_all_inventory_details:', error.message);
            return NextResponse.json({ message: 'Failed to fetch inventory details from function', details: error.message }, { status: 500 });
        }

        // The 'data' will be an array of records returned by your function
        return NextResponse.json(data, { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error in /api/inventory/details:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}