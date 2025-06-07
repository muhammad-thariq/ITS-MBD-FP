// app/api/dashboard/kpi/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabaseClient';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

export async function GET() {
    try {
        // --- REVISED: Lifetime Gross Profit ---
        // Changed 'transaction' to 'transaction' (lowercase) and 't_totalPrice' to 't_totalprice'
        const { data: lifetimeTransactionsSum, error: lifetimeTransactionsSumError } = await supabase
            .from('transaction') // Changed to lowercase
            .select('t_totalprice'); // Changed to lowercase
        if (lifetimeTransactionsSumError) throw lifetimeTransactionsSumError;

        const totalGrossProfit = lifetimeTransactionsSum.reduce((sum, tx) => sum + parseFloat(tx.t_totalprice), 0);

        // --- Gross profit for the last 7 days (daily breakdown) ---
        const sevenDaysAgo = dayjs().subtract(6, 'days').startOf('day');
        const dailyProfitMap: { [key: string]: number } = {};
        const labels: string[] = [];
        const data: number[] = [];

        for (let i = 0; i < 7; i++) {
            const date = sevenDaysAgo.add(i, 'day');
            const formattedDate = date.format('YYYY-MM-DD');
            const displayLabel = date.format('ddd, MMM D');
            dailyProfitMap[formattedDate] = 0;
            labels.push(displayLabel);
        }

        // Changed 'transaction' to 'transaction' (lowercase) and 't_dateTime', 't_totalPrice' to 't_datetime', 't_totalprice'
        const { data: dailyTransactions, error: dailyTransactionsError } = await supabase
            .from('transaction') // Changed to lowercase
            .select('t_datetime, t_totalprice') // Changed to lowercase
            .gte('t_datetime', sevenDaysAgo.toISOString()); // Changed to lowercase

        if (dailyTransactionsError) throw dailyTransactionsError;

        dailyTransactions.forEach(tx => {
            const date = dayjs(tx.t_datetime).format('YYYY-MM-DD');
            dailyProfitMap[date] = (dailyProfitMap[date] || 0) + parseFloat(tx.t_totalprice);
        });

        Object.keys(dailyProfitMap).sort().forEach(date => {
            data.push(dailyProfitMap[date]);
        });

        return NextResponse.json({
            totalGrossProfit: totalGrossProfit,
            dailyGrossProfit: {
                labels: labels,
                data: data
            }
        });

    } catch (error: unknown) { // Changed 'any' to 'unknown'
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) { // Type guard to safely access error properties
            errorMessage = error.message;
        }
        console.error('Error fetching dashboard KPIs:', errorMessage);
        return NextResponse.json({ message: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}