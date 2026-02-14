import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { HelpCircle } from 'lucide-react';

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    unit?: string;
    error?: string;
    help?: string; // Tooltip/help text
    className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({
    label,
    unit,
    error,
    help,
    className,
    ...props
}) => {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <div className={twMerge('flex flex-col gap-1.5', className)}>
            <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                {label}
                {help && (
                    <span
                        className="relative inline-flex"
                        onMouseEnter={() => setShowHelp(true)}
                        onMouseLeave={() => setShowHelp(false)}
                    >
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
                        {showHelp && (
                            <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-normal text-white bg-slate-800 rounded-lg shadow-lg whitespace-nowrap max-w-[260px] text-wrap leading-relaxed animate-in fade-in">
                                {help}
                            </span>
                        )}
                    </span>
                )}
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
            {error && <p className="text-sm text-red-500 animate-pulse">{error}</p>}
        </div>
    );
};

