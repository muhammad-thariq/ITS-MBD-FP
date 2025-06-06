// C:\Users\Thariq\Documents\ITS\SEMESTER_4\MBD\FP\my-next-app\src\app\api\customers\active-membership\route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabaseClient'; // Adjust path based on your folder depth

export async function GET() {
    try {
        // Query the Supabase view directly
        const { data, error } = await supabase
            .from('customers_with_active_membership') // Name of your new view
            .select('*'); // Select all columns from the view

        if (error) {
            console.error('Error fetching customers with active membership:', error.message);
            return NextResponse.json({ message: 'Failed to fetch active customers', details: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 200 });

    } catch (error: any) {
        console.error('Unexpected error in /api/customers/active-membership:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}