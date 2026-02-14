import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    description?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, title, description }) => {
    return (
        <div className={twMerge('glass-panel rounded-xl transition-all duration-300 hover:shadow-lg p-6', className)}>
            {(title || description) && (
                <div className="mb-6">
                    {title && <h3 className="text-lg font-bold text-slate-800">{title}</h3>}
                    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
                </div>
            )}
            {children}
        </div>
    );
};
