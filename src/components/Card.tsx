// components/Card.tsx
import React from 'react';

interface CardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
    return (
        <div className={`bg-white shadow rounded-lg p-4 ${className}`}>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
            {children}
        </div>
    );
};

export default Card;