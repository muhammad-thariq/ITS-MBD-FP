// app/api/dashboard/activity/route.ts
import { NextResponse } from 'next/server';
// Removed: import { supabase } from '../../../../utils/supabaseClient'; (no longer needed in this file)

export async function GET() {
    try {
        // --- REMOVED: All previous data fetching for transactions, recent customers, staff, printers, and maintenance ---
        // Since these sections are being removed from the dashboard, this API route will now
        // return an empty object as it no longer serves data.

        return NextResponse.json({}); // Return an empty object

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) { // Type guard to safely access error properties
            errorMessage = error.message;
        }
        console.error('Error fetching dashboard activity:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}