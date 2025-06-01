// app/api/dashboard/activity/route.ts
import { NextResponse } from 'next/server';
// Removed: import { supabase } from '../../../../utils/supabaseClient'; (no longer needed in this file)

export async function GET() {
    try {
        // --- REMOVED: All previous data fetching for transactions, recent customers, staff, printers, and maintenance ---
        // Since these sections are being removed from the dashboard, this API route will now
        // return an empty object as it no longer serves data.

        return NextResponse.json({}); // Return an empty object
        
    } catch (error: any) {
        console.error('Error fetching dashboard activity:', error.message);
        return NextResponse.json({ message: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}