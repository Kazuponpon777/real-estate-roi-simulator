/**
 * Real Estate ROI Simulator - Calculation Utilities
 */

// --- Constants ---
export const TAX_RATES = {
    REGISTRATION_LICENSE: {
        LAND_OWNERSHIP_TRANSFER: 0.015, // 土地所有権移転登記 (軽減税率)
        BUILDING_PRESERVATION: 0.004,   // 建物保存登記
        MORTGAGE_SETTING: 0.004,        // 抵当権設定登記
    },
    REAL_ESTATE_ACQUISITION: {
        LAND: 0.03,     // 不動産取得税 (土地) - 軽減措置あり実質低いが一旦標準
        BUILDING: 0.03, // 不動産取得税 (建物)
        RESIDENTIAL_REDUCTION: 12000000, // 住宅用土地の軽減控除額 (例)
    },
    FIXED_ASSET: 0.014, // 固定資産税
    CITY_PLANNING: 0.003, // 都市計画税
};

// --- Loan Calculations ---

/**
 * PMT (Payment) Calculation for Principal and Interest Equal Repayment
 * @param principal Principal amount (Loan amount)
 * @param ratePtr Yearly interest rate in percentage (e.g. 1.5 for 1.5%)
 * @param years Loan duration in years
 * @returns Monthly payment amount
 */
export const calculatePmt = (principal: number, ratePtr: number, years: number): number => {
    if (ratePtr === 0) return Math.round(principal / (years * 12));

    const monthlyRate = ratePtr / 100 / 12;
    const numPayments = years * 12;

    // PMT formula: P * (r(1+r)^n) / ((1+r)^n - 1)
    const factor = Math.pow(1 + monthlyRate, numPayments);
    const monthlyPayment = (principal * monthlyRate * factor) / (factor - 1);

    return Math.round(monthlyPayment);
};

// --- Unit Conversions ---

export const TSUBO_TO_M2 = 3.30578;

export const tsuboToM2 = (tsubo: number): number => {
    return tsubo * TSUBO_TO_M2;
};

export const m2ToTsubo = (m2: number): number => {
    return m2 / TSUBO_TO_M2;
};

// --- ROI Metrics ---

export const calculateGrossYield = (annualRent: number, totalInvestment: number): number => {
    if (totalInvestment === 0) return 0;
    return (annualRent / totalInvestment) * 100;
};

export const calculateNetYield = (noi: number, totalInvestment: number): number => {
    if (totalInvestment === 0) return 0;
    return (noi / totalInvestment) * 100;
};
