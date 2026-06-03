import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { HelpCircle } from 'lucide-react';

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    unit?: string;
    error?: string;
    help?: string; // Tooltip/help text
    className?: string;
    actionIcon?: React.ReactNode;
    onAction?: () => void;
    actionTooltip?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({
    label,
    unit,
    error,
    help,
    className,
    actionIcon,
    onAction,
    actionTooltip,
    ...props
}) => {
    const [showHelp, setShowHelp] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const displayValue = React.useMemo(() => {
        if (props.value === '' || props.value === undefined || props.value === null) return '';
        if (isFocused || props.type !== 'number') return props.value;

        const numStr = String(props.value);
        const parts = numStr.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }, [props.value, isFocused, props.type]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (props.type === 'number') {
            // Remove commas before passing to parent
            e.target.value = e.target.value.replace(/,/g, '');
        }
        props.onChange?.(e);
    };

    return (
        <div className={twMerge('flex flex-col gap-1.5 w-full', className)}>
            <label className="text-sm font-bold text-[#23150d]/80 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                    {label}
                    {help && (
                        <span
                            className="relative inline-flex"
                            onMouseEnter={() => setShowHelp(true)}
                            onMouseLeave={() => setShowHelp(false)}
                        >
                            <HelpCircle className="h-3.5 w-3.5 text-[#8c6c59]/70 hover:text-[#a87c28] cursor-help transition-colors" />
                            {showHelp && (
                                <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-normal text-white bg-slate-800 rounded-lg shadow-lg whitespace-nowrap max-w-[260px] text-wrap leading-relaxed animate-in fade-in">
                                    {help}
                                </span>
                            )}
                        </span>
                    )}
                </span>
                {actionIcon && (
                    <button
                        type="button"
                        className="text-[#a87c28] hover:text-[#8c6114] transition-colors p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-[#a87c28]/35"
                        title={actionTooltip}
                        onClick={onAction}
                        tabIndex={-1}
                    >
                        {actionIcon}
                    </button>
                )}
            </label>
            <div className="relative flex items-stretch w-full">
                <input
                    {...props}
                    type={props.type === 'number' ? 'text' : props.type}
                    inputMode={props.type === 'number' ? 'numeric' : props.inputMode}
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className={twMerge(
                        'flex-1 min-w-0 w-full glass-input rounded-lg px-3 py-2.5 text-base text-[#23150d] shadow-sm bg-white border border-[#e8dcc4]',
                        'focus:border-[#a87c28] focus:ring-2 focus:ring-[#a87c28]/20 focus:outline-none',
                        'disabled:bg-[#fcf9f2]/55 disabled:text-[#8c6c59]/60',
                        '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                        unit ? '!rounded-r-none !border-r-0' : '',
                        error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''
                    )}
                />
                {unit && (
                    <div className="flex shrink-0 select-none items-center justify-center rounded-r-lg border border-l-0 border-[#e8dcc4] bg-[#fcf9f2] px-3 text-sm font-semibold text-[#8c6114] whitespace-nowrap min-w-max">
                        {unit}
                    </div>
                )}
            </div>
            {error && <p className="text-sm text-rose-600 animate-pulse font-medium">{error}</p>}
        </div>
    );
};

