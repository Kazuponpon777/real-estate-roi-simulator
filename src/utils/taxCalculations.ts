/**
 * Depreciation & Tax Calculation Utilities
 * 
 * Handles:
 * - Building depreciation (straight-line method)
 * - Equipment depreciation (shorter useful life)
 * - Real estate income tax (individual progressive / corporate flat)
 * - ATCF (After-Tax Cash Flow)
 */

// --- Useful Life Table (Japanese Tax Law) ---
// --- 法定耐用年数テーブル (日本の税法に基づく基準値) ---
export const STATUTORY_USEFUL_LIFE: Record<string, number> = {
    RC: 47,         // 鉄筋コンクリート造
    S: 34,          // 鉄骨造
    Wood: 22,       // 木造
    SteelLight: 27, // 軽量鉄骨造
    Equipment: 15,  // 建物附属設備 (電気設備・給排水設備など: 15年)
};

const USEFUL_LIFE = STATUTORY_USEFUL_LIFE;

const EQUIPMENT_USEFUL_LIFE = 15; // 建物附属設備

/**
 * 中古物件の簡便法による残存耐用年数計算
 * 法定耐用年数をすべて経過している場合: 法定耐用年数 × 20% (最低2年)
 * 法定耐用年数の一部を経過している場合: (法定耐用年数 - 経過年数) + 経過年数 × 20%
 */
export const getUsedUsefulLife = (structure: string, buildingAge: number): number => {
    const fullLife = USEFUL_LIFE[structure] || 47;
    if (buildingAge >= fullLife) {
        return Math.max(Math.floor(fullLife * 0.2), 2);
    }
    return Math.floor((fullLife - buildingAge) + buildingAge * 0.2);
};

/**
 * Straight-line depreciation rate
 */
export const getDepreciationRate = (usefulLife: number): number => {
    return 1 / usefulLife;
};

// --- Depreciation Info ---
export interface DepreciationInfo {
    buildingDepreciation: number;    // Annual building depreciation (円)
    equipmentDepreciation: number;   // Annual equipment depreciation (円)
    totalDepreciation: number;       // Total annual depreciation (円)
    buildingUsefulLife: number;      // Years
    equipmentUsefulLife: number;     // Years
}

export const calculateDepreciation = (
    structure: string,
    buildingCost: number,         // 建物価格 (円)
    equipmentRatio: number,       // 設備比率 (0-1, 例: 0.2 = 20%)
    isUsed: boolean,
    buildingAge: number = 0,
    method: 'statutory' | 'simplified' | 'custom' = 'simplified', // 償却期間算出方法
    customBuildingUsefulLife?: number,  // カスタムの建物償却年数
    customEquipmentUsefulLife?: number, // カスタムの設備償却年数
): DepreciationInfo => {
    const buildingPortion = buildingCost * (1 - equipmentRatio);
    const equipmentPortion = buildingCost * equipmentRatio;

    let buildingUsefulLife = USEFUL_LIFE[structure] || 47;
    let equipmentUsefulLife = EQUIPMENT_USEFUL_LIFE;

    if (method === 'custom') {
        // 直接入力されたカスタム耐用年数を適用
        buildingUsefulLife = customBuildingUsefulLife || buildingUsefulLife;
        equipmentUsefulLife = customEquipmentUsefulLife || equipmentUsefulLife;
    } else if (isUsed && method === 'simplified') {
        // 中古物件かつ簡便法(推奨)を適用
        buildingUsefulLife = getUsedUsefulLife(structure, buildingAge);
        equipmentUsefulLife = getUsedUsefulLife('Equipment', Math.min(buildingAge, EQUIPMENT_USEFUL_LIFE));
    } else {
        // 新築、または中古物件で法定耐用年数をそのまま適用
        buildingUsefulLife = USEFUL_LIFE[structure] || 47;
        equipmentUsefulLife = EQUIPMENT_USEFUL_LIFE;
    }

    // 耐用年数が0以下にならないように安全ガード (0除算によるNaN・Infinity防止)
    if (buildingUsefulLife <= 0) buildingUsefulLife = 1;
    if (equipmentUsefulLife <= 0) equipmentUsefulLife = 1;

    const buildingDepreciation = buildingPortion * getDepreciationRate(buildingUsefulLife);
    const equipmentDepreciation = equipmentRatio > 0
        ? equipmentPortion * getDepreciationRate(equipmentUsefulLife)
        : 0;

    return {
        buildingDepreciation: Math.floor(buildingDepreciation),
        equipmentDepreciation: Math.floor(equipmentDepreciation),
        totalDepreciation: Math.floor(buildingDepreciation + equipmentDepreciation),
        buildingUsefulLife,
        equipmentUsefulLife,
    };
};

/**
 * Check if depreciation is still active for a given year
 */
export const getYearlyDepreciation = (depInfo: DepreciationInfo, year: number): number => {
    let total = 0;
    if (year <= depInfo.buildingUsefulLife) {
        total += depInfo.buildingDepreciation;
    }
    if (year <= depInfo.equipmentUsefulLife) {
        total += depInfo.equipmentDepreciation;
    }
    return total;
};

// --- Income Tax Calculation ---

// Japanese individual income tax brackets (2024)
const INDIVIDUAL_TAX_BRACKETS = [
    { limit: 1_950_000, rate: 0.05, deduction: 0 },
    { limit: 3_300_000, rate: 0.10, deduction: 97_500 },
    { limit: 6_950_000, rate: 0.20, deduction: 427_500 },
    { limit: 9_000_000, rate: 0.23, deduction: 636_000 },
    { limit: 18_000_000, rate: 0.33, deduction: 1_536_000 },
    { limit: 40_000_000, rate: 0.40, deduction: 2_796_000 },
    { limit: Infinity, rate: 0.45, deduction: 4_796_000 },
];

const RESIDENT_TAX_RATE = 0.10; // 住民税率 10%

/**
 * Calculate individual income tax on real estate income
 * 
 * @param taxableIncome - 不動産課税所得 (NOI - depreciation - interest)
 * @param otherIncome - 給与所得等の他の所得 (for total income bracket determination)
 * @returns Tax amount (所得税 + 住民税)
 */
export const calculateIndividualTax = (
    taxableIncome: number,
    otherIncome: number = 0,
): number => {
    // 日本の超過累進税率と控除額を適用して所得税額を算出するヘルパー
    const calcTax = (amount: number): number => {
        if (amount <= 0) return 0;
        const bracket = INDIVIDUAL_TAX_BRACKETS.find(b => amount <= b.limit) 
            || INDIVIDUAL_TAX_BRACKETS[INDIVIDUAL_TAX_BRACKETS.length - 1];
        return amount * bracket.rate - bracket.deduction;
    };

    const otherTax = calcTax(otherIncome);

    if (taxableIncome < 0) {
        // --- 【損益通算による節税・還付効果の計算】 ---
        // 他所得（給与等）から不動産の赤字分を差し引いた、新たな総所得に対する所得税
        const netIncome = Math.max(0, otherIncome + taxableIncome);
        const totalTaxWithLoss = calcTax(netIncome);
        
        // 所得税の還付額（マイナス値 = 節税効果）
        const incomeTaxRefund = totalTaxWithLoss - otherTax;
        
        // 日本語コメント: 住民税の減額分（赤字額の10%が住民税から控除される）
        // ただし、他所得から支払う住民税額（otherIncome * 10%）が上限となり、それを超えて過大還付になることはありません
        const maxResidentTaxSaving = otherIncome * RESIDENT_TAX_RATE; // 他所得にかかる住民税額 (正の値)
        const residentTaxSaving = Math.max(-maxResidentTaxSaving, taxableIncome * RESIDENT_TAX_RATE); // 負の値同士でMaxをとることで還付額(絶対値)を制限
        
        // 節税効果の合計（マイナス値として返し、ATCF = BTCF - TaxAmount でキャッシュが『増える』ようにする）
        return Math.floor(incomeTaxRefund + residentTaxSaving);
    } else {
        // 通常の課税所得がある場合の計算
        const totalIncome = taxableIncome + otherIncome;
        const totalTax = calcTax(totalIncome);
        
        const incomeTax = Math.max(0, totalTax - otherTax);
        const residentTax = taxableIncome * RESIDENT_TAX_RATE;
        
        return Math.floor(incomeTax + residentTax);
    }
};

/**
 * Calculate corporate tax (simplified effective rate)
 * 
 * @param taxableIncome - 法人課税所得
 * @param isSmallBusiness - 中小法人 (capital <= 1億)
 * @returns Tax amount
 */
export const calculateCorporateTax = (
    taxableIncome: number,
    isSmallBusiness: boolean = true,
): number => {
    if (taxableIncome <= 0) return 0;

    // Simplified effective rates
    if (isSmallBusiness) {
        if (taxableIncome <= 8_000_000) {
            return Math.floor(taxableIncome * 0.25); // ~25% effective for small biz
        }
        return Math.floor(8_000_000 * 0.25 + (taxableIncome - 8_000_000) * 0.35);
    }
    return Math.floor(taxableIncome * 0.30); // ~30% effective for large
};

export type TaxMode = 'individual' | 'corporate';

/**
 * デッドクロス（ローン元金返済額 ＞ 減価償却費）の分析用インターフェース
 */
export interface DeadCrossAnalysis {
    hasDeadCross: boolean;           // デッドクロスが発生するかどうか
    deadCrossYear: number | null;    // 発生する最初の年 (1-indexed)
    maxTaxIncrease: number;          // デッドクロス発生後の最大増税概算額 (円)
    maxCashCrunchYear: number | null; // キャッシュフローが最も圧迫される年
}

/**
 * 35年間の長期予測データを元に、デッドクロスの発生有無と深刻度を分析する
 * @param projectionData 年次予測データ配列
 * @param taxRate 実効所得税・住民税率の概算 (デフォルト30% = 0.3)
 */
export const analyzeDeadCross = (
    projectionData: any[],
    taxRate: number = 0.3
): DeadCrossAnalysis => {
    let deadCrossYear: number | null = null;
    let maxTaxIncrease = 0;
    let maxCashCrunchYear: number | null = null;
    let worstAtcf = Infinity;

    projectionData.forEach((row) => {
        const { year, depreciation, principal, atcf } = row;

        // デッドクロス判定条件: 元金返済額が減価償却費を上回る最初の年
        if (principal > depreciation && !deadCrossYear) {
            deadCrossYear = year;
        }

        // デッドクロス発生後の増税インパクトおよび手残りの最小（ワースト）年を追跡
        if (deadCrossYear && year >= deadCrossYear) {
            // 償却費が減ることで、本来経費にならない「元金」の返済が上回り、
            // その差額分に対して課税されることによる増税額の概算
            const extraTaxable = principal - depreciation;
            const estimatedTaxHit = extraTaxable * taxRate;
            if (estimatedTaxHit > maxTaxIncrease) {
                maxTaxIncrease = Math.floor(estimatedTaxHit);
            }

            // 税引後キャッシュフロー (ATCF) が最も低くなる年を特定
            if (atcf < worstAtcf) {
                worstAtcf = atcf;
                maxCashCrunchYear = year;
            }
        }
    });

    return {
        hasDeadCross: deadCrossYear !== null,
        deadCrossYear,
        maxTaxIncrease,
        maxCashCrunchYear,
    };
};
