/**
 * Real Estate ROI Simulator - Formatter Utilities
 */

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        maximumFractionDigits: 0,
    }).format(value);
};

export const formatManYen = (value: number): string => {
    // Input often comes as raw number. If we assume internal values are in "Yen",
    // 1,000,000 -> "100万円"
    // If internal values are in "10,000 Yen", 100 -> "100万円"
    // *Assumption*: Internal state for large sums is in "10,000 Yen" (Man-en) unit for easier input, 
    // but strictly speaking, we might want to store raw Yen.
    // Let's stick to storing 'Man-en' as the primary unit for user input fields if the requirement says "単位（円/万円）の明示".
    // However, for calculation it's safer to convert.
    // For this display formatter, we assume the input IS ALREADY in Man-en if it's a small number, 
    // or use a smart heuristic. 
    // Better approach: Just format with commas. The Unit label will be outside the input.
    return new Intl.NumberFormat('ja-JP').format(value);
};

export const formatPercent = (value: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value / 100);
};

export const formatNumber = (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat('ja-JP', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};
