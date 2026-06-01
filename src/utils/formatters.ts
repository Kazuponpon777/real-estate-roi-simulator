/**
 * Real Estate ROI Simulator - Formatter Utilities
 */

/**
 * 通貨フォーマッター (日本円表記: ¥1,234,567)
 * NaNや無限大などの無効値は安全に ¥0 にフォールバック
 */
export const formatCurrency = (value: number): string => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '¥0';
    }
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        maximumFractionDigits: 0,
    }).format(value);
};

/**
 * 万円単位などの数値フォーマッター (カンマ区切り: 1,234)
 */
export const formatManYen = (value: number): string => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '0';
    }
    return new Intl.NumberFormat('ja-JP').format(value);
};

/**
 * パーセンテージフォーマッター (例: 1.5 -> "1.50%")
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        const fallbackPercent = (0).toFixed(decimals);
        return `${fallbackPercent}%`;
    }
    return new Intl.NumberFormat('ja-JP', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value / 100);
};

/**
 * 一般数値フォーマッター
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '0';
    }
    return new Intl.NumberFormat('ja-JP', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};
