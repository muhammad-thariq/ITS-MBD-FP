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

    } catch (error: unknown) { // Change 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) { // Type guard to check if error is an instance of Error
            errorMessage = error.message;
        }
        console.error('Unexpected error in /api/customers/active-membership:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}