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
 * 元利均等返済における毎月の返済額 (PMT) を計算する
 * @param principal 借入元金 (円)
 * @param ratePtr 年利 (%) (例: 1.5% の場合は 1.5)
 * @param years 借入期間 (年)
 * @returns 毎月の返済額 (円)
 */
export const calculatePmt = (principal: number, ratePtr: number, years: number): number => {
    // 借入元金または借入期間が0以下の場合は返済不要 (0除算ガード)
    if (principal <= 0 || years <= 0) return 0;
    
    // 金利がマイナスの場合は0%として処理
    if (ratePtr < 0) ratePtr = 0;

    // 金利が0%の場合は単なる元金均等割
    if (ratePtr === 0) return Math.round(principal / (years * 12));

    const monthlyRate = ratePtr / 100 / 12;
    const numPayments = years * 12;

    // PMT計算公式: 元金 * (月利 * (1 + 月利)^返済回数) / ((1 + 月利)^返済回数 - 1)
    const factor = Math.pow(1 + monthlyRate, numPayments);
    
    // 金利や期間が極端に大きく、JavaScriptの数値表現上限を超えて複利係数が無限大(Infinity)になった場合の安全処理
    if (!isFinite(factor) || factor - 1 === 0) {
        return Math.round(principal * monthlyRate);
    }

    const monthlyPayment = (principal * monthlyRate * factor) / (factor - 1);

    // 計算結果がNaNまたは無限大になった場合は0にフォールバック
    return isNaN(monthlyPayment) || !isFinite(monthlyPayment) ? 0 : Math.round(monthlyPayment);
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
