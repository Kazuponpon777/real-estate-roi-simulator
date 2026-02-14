import React from 'react';
import { twMerge } from 'tailwind-merge';

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    unit?: string;
    error?: string;
    className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({
    label,
    unit,
    error,
    className,
    ...props
}) => {
    return (
        <div className={twMerge('flex flex-col gap-1.5', className)}>
            <label className="text-sm font-semibold text-slate-600">
                {label}
            </label>
            <div className="relative flex items-center">
                <input
                    className={twMerge(
                        'flex-1 glass-input rounded-lg px-4 py-2.5 text-base text-slate-900 shadow-sm',
                        'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
                        'disabled:bg-slate-50/50 disabled:text-slate-500',
                        unit ? 'rounded-r-none border-r-0' : '',
                        error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''
                    )}
                    {...props}
                />
                {unit && (
                    <div className="flex select-none items-center justify-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50/50 px-3 text-sm font-medium text-slate-500">
                        {unit}
                    </div>
                )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
};
