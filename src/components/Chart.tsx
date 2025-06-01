// components/Chart.tsx
import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface BarChartProps {
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string[];
            borderColor: string[];
            borderWidth: number;
        }[];
    };
    options?: any;
    title: string;
    horizontal?: boolean; // NEW PROP: to control orientation
}

interface PieChartProps {
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string[];
            borderColor: string[];
            borderWidth: number;
        }[];
    };
    options?: any;
    title: string;
}

// REVISED: Renamed HorizontalBarChart to a more generic BarChart
export const BarChart: React.FC<BarChartProps> = ({ data, options, title, horizontal = false }) => {
    const defaultOptions = {
        indexAxis: horizontal ? 'y' as const : 'x' as const, // Uses 'y' for horizontal, 'x' for vertical
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: title,
            },
        },
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true,
            },
        },
        ...options,
    };
    return <Bar data={data} options={defaultOptions} />;
};

export const PieChart: React.FC<PieChartProps> = ({ data, options, title }) => {
    const defaultOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: title,
            },
        },
        ...options,
    };
    return <Pie data={data} options={defaultOptions} />;
};