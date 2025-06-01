// app/layout.tsx
import './globals.css'; // Your global styles (e.g., Tailwind CSS base)
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Admin Dashboard',
    description: 'A comprehensive admin dashboard for printer service management.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {/* You can add a consistent navigation bar or sidebar here if desired */}
                {children}
            </body>
        </html>
    );
}