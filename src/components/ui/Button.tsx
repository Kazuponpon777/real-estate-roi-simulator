import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    disabled,
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] font-bold';

    const variants = {
        primary: 'bg-gradient-to-r from-[#aa7c11] to-[#8a5d3b] hover:from-[#bfa153] hover:to-[#a47b52] text-[#fdfaf5] hover:scale-[1.02] focus:ring-[#a87c28]/50 shadow-md hover:shadow-lg border border-transparent active:scale-[0.98]',
        secondary: 'bg-[#fcf9f2] text-[#23150d] hover:bg-[#f5ebd9] border border-[#e8dcc4] shadow-sm hover:shadow focus:ring-[#a87c28]/35',
        outline: 'border border-[#e8dcc4] bg-transparent text-[#23150d] hover:bg-[#ebd9c5]/35 focus:ring-[#a87c28]/35',
        ghost: 'text-[#8c6114] hover:bg-[#f5ebd9] hover:text-[#23150d] focus:ring-[#a87c28]/25',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm border border-transparent',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5 text-base',
        lg: 'px-6 py-3.5 text-lg',
    };

    return (
        <button
            className={twMerge(baseStyles, variants[variant], sizes[size], className)}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? (
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            ) : null}
            {children}
        </button>
    );
};
