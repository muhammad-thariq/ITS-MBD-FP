// --- Nama File: ..\my-next-app\src\app\page.tsx ---
'use client';

import { useState, useEffect } from 'react';
import Card from '../components/Card';
import { BarChart } from '../components/Chart';
import dayjs from 'dayjs';
import PrinterTable from '../components/PrinterTable'; // Keep commented out as it's not used directlyi
import PrinterDetailsTable from '../components/PrinterDetailsTable';
import InventoryTableFromFunction from '../components/InventoryTableFromFunction';
import ActiveCustomersTable from '../components/ActiveCustomersTable';
import AddTransactionModal from '../components/AddTransactionModal'; // <--- NEW IMPORT


// Define interfaces for data fetched from API routes
interface SummaryData {
    customers: {
        total: number;
        membership: number;
        nonMembership: number;
    };
    staff: {
        total: number;
    };
    printers: {
        total: number;
        inService: number;
        inMaintenance: number;
    };
    inventoryStock: { iName: string; iStock: number; }[];
    totalTransactions: number;
}

interface KPIData {
    totalGrossProfit: number;
    dailyGrossProfit: {
        labels: string[];
        data: number[];
    };
}

const DashboardPage: React.FC = () => {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [kpi, setKpi] = useState<KPIData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false); // New state for modal

    // Function to fetch all dashboard data
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [summaryRes, kpiRes] = await Promise.all([
                fetch('/api/dashboard/summary'),
                fetch('/api/dashboard/kpi'),
            ]);

            if (!summaryRes.ok || !kpiRes.ok) {
                let errorMessage = 'Failed to fetch dashboard data: ';
                if (!summaryRes.ok) errorMessage += `Summary (${summaryRes.status}) `;
                if (!kpiRes.ok) errorMessage += `KPI (${kpiRes.status}) `;
                throw new Error(errorMessage.trim());
            }

            const summaryData: SummaryData = await summaryRes.json();
            const kpiData: KPIData = await kpiRes.json();

            setSummary(summaryData);
            setKpi(kpiData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []); // Initial data fetch on component mount

    const handleTransactionAdded = (success: boolean) => {
        setIsTransactionModalOpen(false); // Close modal
        if (success) {
            fetchData(); // Refresh dashboard data if transaction was successful
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-600">Loading dashboard...</div>;
    }
    if (error) {
        return <div className="p-8 text-center text-red-600">Error: {error}</div>;
    }
    if (!summary || !kpi) {
        return <div className="p-8 text-center text-gray-600">No data available.</div>;
    }

    const dailyGrossProfitChartData = {
        labels: kpi.dailyGrossProfit.labels,
        datasets: [
            {
                label: 'Gross Profit',
                data: kpi.dailyGrossProfit.data,
                backgroundColor: ['#4CAF50'],
                borderColor: ['#388E3C'],
                borderWidth: 1,
            },
        ],
    };

    const inventoryStockChartData = {
        labels: summary.inventoryStock.map(item => item.iName),
        datasets: [
            {
                label: 'Units in Stock',
                data: summary.inventoryStock.map(item => item.iStock),
                backgroundColor: summary.inventoryStock.map(item => item.iStock < 10 ? '#EF4444' : '#3B82F6'),
                borderColor: summary.inventoryStock.map(item => item.iStock < 10 ? '#DC2626' : '#2563EB'),
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">

            {/* Summary Statistics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {/* Total Transactions Card */}
                <Card title="Total Transactions">
                    <p className="text-4xl font-bold text-purple-600">{summary.totalTransactions}</p>
                </Card>

                {/* Total Customers Card */}
                <Card title="Total Customers">
                    <p className="text-4xl font-bold text-blue-600">{summary.customers.total}</p>
                    <p className="text-sm text-gray-500">Membership: {summary.customers.membership}</p>
                    <p className="text-sm text-gray-500">Non-Membership: {summary.customers.nonMembership}</p>
                </Card>

                {/* Total Staff Card */}
                <Card title="Total Staff">
                    <p className="text-4xl font-bold text-indigo-600">{summary.staff.total}</p>
                </Card>

                {/* Total Printers Card */}
                <Card title="Total Printers">
                    <p className="text-4xl font-bold text-indigo-600">{summary.printers.total}</p>
                    <p className="text-sm text-gray-500">In Service: {summary.printers.inService}</p>
                    <p className="text-sm text-gray-500">In Maintenance: {summary.printers.inMaintenance}</p>
                </Card>

                {/* Lifetime Gross Profit Card */}
                <Card title="Lifetime Gross Profit">
                    <p className="text-4xl font-bold text-green-600">Rp {kpi.totalGrossProfit.toLocaleString('id-ID')}</p>
                </Card>
            </div>

            {/* Section for Charts (Inventory Stock and Daily Gross Profit) - Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Inventory Stock Levels Chart Card */}
                <Card title="Inventory Stock Levels">
                    <div style={{ height: '350px' }}>
                        <BarChart
                            data={inventoryStockChartData}
                            title="Current Inventory Stock"
                            horizontal={true}
                            options={{
                                scales: {
                                    x: {
                                        beginAtZero: true,
                                        title: {
                                            display: true,
                                            text: 'Units'
                                        }
                                    },
                                    y: {
                                        title: {
                                            display: true,
                                            text: 'Item Name'
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </Card>

                {/* Gross Profit (Last 7 Days) Chart Card with "Add New Transaction" button */}
                <Card title="Gross Profit (Last 7 Days)">
                    <div className="relative" style={{ height: '300px' }}>
                        <BarChart
                            data={dailyGrossProfitChartData}
                            title="Daily Gross Profit"
                            horizontal={false}
                        />
                        <button
                            onClick={() => setIsTransactionModalOpen(true)}
                            className="absolute bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors shadow-lg"
                        >
                            Add New Transaction
                        </button>
                    </div>
                </Card>
            </div>


            {/* Existing Tables below */}
            <div className="mt-8">
                <InventoryTableFromFunction />
            </div>
            <div className="mt-8">
                <PrinterDetailsTable />
            </div>
            <div className="mt-8">
                <ActiveCustomersTable />
            </div>

            {/* New Transaction Modal */}
            <AddTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onTransactionAdded={handleTransactionAdded}
            />

           <div className="mt-8">
                Your existing PrinterTable remains here, using its original API route
                <PrinterTable
                    title="Printer Management (Standard API)"
                    orderBy="p_id"
                    orderDirection="asc"
                    showAddButton={true}
                    showActions={true}
                    showViewAllLink={false}
                />
            </div>

        </div>
    );
};

export default DashboardPage;