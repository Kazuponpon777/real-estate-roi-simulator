/**
 * Real Estate ROI Simulator - Calculation Utilities
 */

// --- Constants ---
export const TAX_RATES = {
    REGISTRATION_LICENSE: {
        LAND_OWNERSHIP_TRANSFER: 0.015, // 土地所有権移転登記 (軽減税率)
        BUILDING_PRESERVATION: 0.004,   // 建物保存登記
        BUILDING_TRANSFER: 0.02,        // 中古建物移転登記 (2.0%)
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

/**
 * 自動印紙税計算 (Zustandストア内移行用)
 */
export const calculateAutoStampDuty = (budget: any, mode: string): number => {
    const isLeaseMode = mode === 'land_lease';
    const isLandMode = mode === 'land_new';
    const landPrice = (budget.landPrice || 0) * 10000;
    const buildingCost = (budget.buildingWorksCost || 0) * 10000;
    const total = isLeaseMode ? buildingCost : (landPrice + (isLandMode ? buildingCost : 0));
    
    if (total > 100000000) return 6;
    if (total > 50000000) return 3;
    if (total > 10000000) return 1;
    if (total > 5000000) return 0.5;
    return 0;
};

/**
 * 自動登録免許税計算 (Zustandストア内移行用)
 */
export const calculateAutoRegistrationTax = (budget: any, mode: string, buildingRatioPercent: number = 50): number => {
    const isLeaseMode = mode === 'land_lease';
    const isLandMode = mode === 'land_new';
    const isUsedMode = mode === 'investment_used';
    
    let landPrice = (budget.landPrice || 0) * 10000;
    let buildingCost = (budget.buildingWorksCost || 0) * 10000;
    
    // 中古物件の場合は、物件総額（landPrice）を建物比率で按分する
    if (isUsedMode) {
        const total = landPrice;
        buildingCost = total * (buildingRatioPercent / 100);
        landPrice = total * (1 - buildingRatioPercent / 100);
    }
    
    const estLandTaxValue = landPrice * 0.7;
    const estBuildingTaxValue = buildingCost * 0.5;
    
    const regLand = isLeaseMode ? 0 : estLandTaxValue * TAX_RATES.REGISTRATION_LICENSE.LAND_OWNERSHIP_TRANSFER;
    
    let regBuilding = 0;
    if (isLandMode || isLeaseMode) {
        regBuilding = estBuildingTaxValue * TAX_RATES.REGISTRATION_LICENSE.BUILDING_PRESERVATION;
    } else if (isUsedMode) {
        // 中古建物の場合は移転登記 (2.0%)
        regBuilding = estBuildingTaxValue * TAX_RATES.REGISTRATION_LICENSE.BUILDING_TRANSFER;
    } else {
        regBuilding = estBuildingTaxValue * TAX_RATES.REGISTRATION_LICENSE.LAND_OWNERSHIP_TRANSFER;
    }
    
    return Math.round((regLand + regBuilding) / 10000);
};

/**
 * 自動不動産取得税計算 (Zustandストア内移行用)
 */
export const calculateAutoAcquisitionTax = (budget: any, mode: string, buildingRatioPercent: number = 50): number => {
    const isLeaseMode = mode === 'land_lease';
    const isLandMode = mode === 'land_new';
    const isUsedMode = mode === 'investment_used';
    
    let landPrice = (budget.landPrice || 0) * 10000;
    let buildingCost = (budget.buildingWorksCost || 0) * 10000;
    
    // 中古物件の場合は、物件総額（landPrice）を建物比率で按分する
    if (isUsedMode) {
        const total = landPrice;
        buildingCost = total * (buildingRatioPercent / 100);
        landPrice = total * (1 - buildingRatioPercent / 100);
    }
    
    const estLandTaxValue = landPrice * 0.7;
    const estBuildingTaxValue = buildingCost * 0.5;
    
    const acqLand = isLeaseMode ? 0 : Math.max(0, (estLandTaxValue - (isLandMode ? 12000000 : 0)) * TAX_RATES.REAL_ESTATE_ACQUISITION.LAND);
    const acqBuilding = estBuildingTaxValue * TAX_RATES.REAL_ESTATE_ACQUISITION.BUILDING;
    
    return Math.max(0, Math.round((acqLand + acqBuilding) / 10000));
};

/**
 * 自動仲介手数料計算 (Zustandストア内移行用、新築モード土地価格対応)
 */
export const calculateAutoBrokerageFee = (budget: any, mode: string): number => {
    const isLeaseMode = mode === 'land_lease';
    const isLandMode = mode === 'land_new';
    
    if (isLeaseMode) return 0;
    
    const landPrice = (budget.landPrice || 0) * 10000;
    const buildingCost = (budget.buildingWorksCost || 0) * 10000;
    
    // 新築の場合は土地価格のみ、中古の場合は土地・建物総額に対して計算
    const brokerageBase = isLandMode ? landPrice : (landPrice + buildingCost);
    const brokerage = brokerageBase > 4000000 ? (brokerageBase * 0.03 + 60000) * 1.1 : 0;
    
    return Math.round(brokerage / 10000);
};
