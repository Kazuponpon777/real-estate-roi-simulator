import React from 'react';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    onMouseUp?: () => void;
    onTouchEnd?: () => void;
    unit?: string;
    description?: string;
}

export const Slider: React.FC<SliderProps> = ({ 
    label, 
    value, 
    min, 
    max, 
    step, 
    onChange, 
    onMouseUp,
    onTouchEnd,
    unit, 
    description 
}) => {
    // 日本語コメント: ドラッグ中の超高速・滑らかな60FPSレンダリングのため、内部ローカルステートを導入
    const [localValue, setLocalValue] = React.useState(value);

    // 日本語コメント: ストア側のリセット処理等による値の変更をローカルに即時同期
    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleCommit = (val: number) => {
        onChange(val);
    };

    return (
        <div className="space-y-2">
            {label && (
                <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-[#23150d]">{label}</label>
                    <span className="text-sm font-bold text-[#a87c28] font-mono">
                        {localValue}
                        {unit && <span className="text-xs ml-0.5 text-[#8c6c59] font-sans">{unit}</span>}
                    </span>
                </div>
            )}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={localValue}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLocalValue(isNaN(val) ? min : val);
                }}
                onMouseUp={() => {
                    handleCommit(localValue);
                    if (onMouseUp) onMouseUp();
                }}
                onTouchEnd={() => {
                    handleCommit(localValue);
                    if (onTouchEnd) onTouchEnd();
                }}
                onBlur={() => handleCommit(localValue)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        // キーボードでの連続入力の負荷軽減のため極小の遅延同期
                        setTimeout(() => handleCommit(localValue), 50);
                    }
                }}
                className="w-full h-2 bg-[#ebd9c5]/40 rounded-lg appearance-none cursor-pointer accent-[#a87c28] focus:outline-none focus:ring-2 focus:ring-[#a87c28]/35"
            />
            {description && <p className="text-xs text-[#8c6c59] font-medium leading-relaxed">{description}</p>}
        </div>
    );
};
