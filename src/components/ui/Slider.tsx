import React from 'react';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    unit?: string;
    description?: string;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, unit, description }) => {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">{label}</label>
                <span className="text-sm font-bold text-indigo-600">
                    {value}
                    {unit && <span className="text-xs ml-0.5 text-slate-500">{unit}</span>}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
    );
};
